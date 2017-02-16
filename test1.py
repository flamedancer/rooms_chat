#coding: utf-8
import uwsgi
import gevent.select
import redis

import time
import datetime
import json
from json import dumps

import logging

logging.basicConfig(level=logging.DEBUG,
                format='%(asctime)s %(message)s',
                datefmt='%Y %H:%M:%S',
                filename='chat.log',
                filemode='a')

all_users_info = {} 

redis_conf = {
    'host': '127.0.0.1',
    'port': 6377,
    'db': 0,
}

COMMON_ROOM_ID = 'ALL'

with open("index.html") as js_f:
    HTML = js_f.read()

history_msg = []
channels = []

def add_history(msg):
    global history_msg
    history_msg.append(msg)
    if len(history_msg) > 100:
        history_msg = history_msg[-100:]

def application(env, sr):
    
    ws_scheme = 'ws'
    if 'HTTPS' in env or env['wsgi.url_scheme'] == 'https':
        ws_scheme = 'wss'
    
    if env['PATH_INFO'] == '/':
        sr('200 OK', [('Content-Type','text/html')])
        data = {
            'ws_scheme': ws_scheme,
            'host': env['HTTP_HOST'],
            'id': env['uwsgi.core'],
        }

        return HTML%(ws_scheme, data['host'])
    elif env['PATH_INFO'] == '/foobar/':
        connection_info = (env['HTTP_SEC_WEBSOCKET_KEY'], env.get('HTTP_ORIGIN', ''))
        uwsgi.websocket_handshake(env['HTTP_SEC_WEBSOCKET_KEY'], env.get('HTTP_ORIGIN', ''))
        
        redis_com = redis.StrictRedis(**redis_conf)
        channel = redis_com.pubsub()
        channel.subscribe(COMMON_ROOM_ID)
 
        websocket_fd = uwsgi.connection_fd()
        redis_fd = channel.connection._sock.fileno()

        core_id = str(env['uwsgi.core'])
        all_users_info[core_id] = {'redis_channel': channel}

        print "#########################websockets...", core_id
        print "REMOTE_ADDR:", env['REMOTE_ADDR']
        
        while True:
            ready = gevent.select.select([websocket_fd, redis_fd], [], [], 4.0)
            if not ready[0]:
                try:
                    msg =  uwsgi.websocket_recv_nb()
                    
                except IOError:
                    print 'disconnect uid ***** no ready', core_id
                    del_user(core_id, redis_com)
                    continue
            for fd in ready[0]:
                if fd == websocket_fd:
                    try:
                        msg =  uwsgi.websocket_recv_nb()
                    except IOError:
                        print 'disconnect uid ***** no msg', core_id
                        del_user(core_id, redis_com)
                        return '' 
                    if msg:
                        print 'this msg str', msg
                        msg_dict = json.loads(msg.replace("\n", "\\n   "))
                        print "~~~~~~~~~~reseve", msg_dict
                        if 'c' not in msg_dict:
                            continue
                        if msg_dict['c'] in ['s', 'rn']:
                            if core_id not in all_users_info:
                                return 'guochen'
                            if msg_dict['u'].strip(): 
                                all_users_info[core_id]['user_name'] = msg_dict['u']
                            else:
                                all_users_info[core_id]['user_name'] = u'游客' + str(core_id) 
                            response = get_response_user_msg(c=msg_dict['c'])
                            redis_com.publish(COMMON_ROOM_ID, dumps(response))
                            response['uname'] = all_users_info[core_id]['user_name']
                            response['self_id'] = core_id
                            if msg_dict['c'] == 's':
                                response['history_msg'] = history_msg
                            uwsgi.websocket_send(dumps(response))
                        elif msg_dict['c'] == 'chat':
                            chat_msg = msg_dict['m'].strip()
                            if not chat_msg:
                                continue
                            now_channel = COMMON_ROOM_ID
                            if msg_dict['opp'] != COMMON_ROOM_ID:
                                opp = msg_dict['opp'] 
                                now_channel = '|'.join(map(str, sorted(map(int, [core_id, opp]))))
                                if now_channel not in channels:
                                    channels.append(now_channel)
                                    channel.subscribe(now_channel)
                                    all_users_info[opp]['redis_channel'].subscribe(now_channel)
                                    redis_com.publish(now_channel,dumps({})) 
                                    channel.parse_response()
                                    #all_users_info[opp]['redis_channel'].parse_response()

                            response = {
                                'uname': all_users_info[core_id]['user_name'], 
                                'time': str(datetime.datetime.now())[0:-7],
                                'msg': chat_msg,
                                'c': 'chat', 
                                'channel': now_channel, 
                            }
                            add_history(response)
                            logging.info(response['uname'] +" :\n    " + response['msg'] )
                            response = dumps(response)
                            s = redis_com.publish(now_channel, response)
                            print "why no send", s
                            #print channel.parse_response()
                            #uwsgi.websocket_send(response)
    
                        elif msg_dict['c'] == 'e': # end 
                            print 'disconnect uid ***** client close', core_id
                            del_user(core_id, redis_com)
                            return '' 

                elif fd == redis_fd:
                    msg = channel.parse_response()
                    if msg[0] == 'message':
                        uwsgi.websocket_send(msg[2])
            
def get_response_user_msg(**argv):
    response = {
        'all_users': [[str(core_id), all_users_info[core_id]['user_name']] for core_id in all_users_info],
    }
    response.update(argv)
    return response

def del_user(core_id, redis_com):
    del all_users_info[core_id]
    response = get_response_user_msg()
    response['c']='e';
    redis_com.publish(COMMON_ROOM_ID, dumps(response))
    for channel in channels:
        if core_id in channel.split('|'):
            channels.remove(channel)
        
