<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />

        <style type="text/css">
            div#container{width: 1100px;}
            div#header{background-color:#dddd99;}
            div#menu {background-color:#ffff99; height:850px; width:300px; float:left;}
            div#chatwith {background-color:#EEEEEE; height:50px; width:800px; float:left;}
            div#chatcontent {height:700px;width:800px; float:left;}
            div#mychat {background-color:#bbbbbb; height:100px;width:800px; float:left;}
            h1 {margin-bottom:0;}
            h2 {margin-bottom:0; font-size:14px;}
            ul {margin:0;}
            li {list-style:none;}
            div#chatwith span {color:red}
            div#chatcontent textarea {
                background-color:#F0FFFF;
                height:700px;
                width:800px; 
                font-size:16;
                color:#00C957;
                //line-height:31px;
            }
            div#chatcontent textarea .head {color:red}
            div#mychat textarea {height:100px;width:700px;}
            div#mychat button {height:96px;width:96px;font-size:24px;float:right;}
            #userlist .users {}
            #userlist .selected {color:red}
        </style>



        <script language="Javascript">
            var s = new WebSocket("%s://%s/foobar/");
            s.onopen = function() {
                //alert("connected !!!");
                s.send('{"u":"'+document.getElementById('myname').innerHTML+'","c":"s"}');
            };

            var room_chat_str = new Array();
            var this_chater = 'ALL';
            var self_id = '';

            s.onmessage = function(e) {
                var obj = eval ("(" + e.data + ")"); 
                
                if(obj.c=='s' || obj.c=='rn' || obj.c=='e'){
                    //var bb = document.getElementById('blackboard')
                    //bb.innerHTML = '<br/>' + obj.all_users;
                    if(obj.uname && obj.self_id){
                        var aa = document.getElementById('myname');
                        aa.value = obj.uname;
                        self_id = obj.self_id;
                    };

                    var ulist = document.getElementById('userlist');
                    var ulist_cont = ulist.innerHTML;
                    var append_cont = ''; 
                    for(user_index in obj.all_users) {
                        //alert(obj.all_users[user_index]);
                        var coreid = obj.all_users[user_index][0];
                        var uname = obj.all_users[user_index][1];
                        if(coreid==this_chater) {
                            var append_cont = append_cont+'<li class="selected" coreid="'+coreid+'" onclick="select_chater(this);">'+obj.all_users[user_index][1] + "</li>"; 
                        }
                        else {
                            var append_cont = append_cont+'<li class="users" coreid="'+coreid+'" onclick="select_chater(this);">'+obj.all_users[user_index][1] + "</li>"; 
                        }
                    };
                    ulist.innerHTML = append_cont; 



                    var now_all_users = document.getElementsByClassName('users');
                    //for(now_user_index in now_all_users) {
                    //    alert(now_user_index);
                    //    alert(all_users[index]);
                    //    if(all_users[index].getAttribute('coreid')==this_chater) { 
                    //        all_users[index].className='selected';
                    //        break;
                    //    };
                    //};

               } 
                else if(obj.c=='chat') {
                    // recive chat msg
                    var opp='ALL'
                    //alert(obj.channel);
                    if(opp != obj.channel) {
                        var opp_array=obj.channel.split('|');
                        if(self_id==opp_array[0]) {
                            opp=opp_array[1]; 
                        }
                        else if(self_id==opp_array[1]) { 
                            opp=opp_array[0]; 
                        }
                        else
                            return;
                    }
                    //alert(opp);

                    var old_chat_cont = room_chat_str[opp];
                    if(typeof old_chat_cont == 'undefined') {
                        old_chat_cont = '';
                    }
                        
                    var chat_name = obj.uname;
                    var chat_time = obj.time;
                    var chat_msg = obj.msg; 
                    var head_cont = '\n'+chat_name+'  '+chat_time+' :';
                    var chat_cont = '\n'+'   '+obj.msg;
                    
                    var new_cont = old_chat_cont+head_cont+chat_cont;
                    room_chat_str[opp] = new_cont;

                    //var old_chat_cont = chatbox_obj.innerHTML; 
                    //var chat_name = obj.uname;   
                    //var chat_time = obj.time;
                    //var chat_msg = obj.msg;
                    //var head_cont = '\n'+chat_name+'  '+chat_time+' :';
                    //var chat_cont = '\n'+'   '+obj.msg;
                    //chatbox_obj.innerHTML = old_chat_cont+head_cont+chat_cont;
                    if(opp==this_chater) {
                        var chatbox_obj = document.getElementById('chatbox');
                        chatbox_obj.innerHTML = new_cont;
                        chatbox_obj.scrollTop=chatbox_obj.value.length;
                    }
                    else {
                        var all_users = document.getElementsByClassName('users');
                        for(index in all_users) {
                            if(all_users[index].getAttribute('coreid')==opp) { 
                                all_users[index].innerHTML=all_users[index].innerHTML+'    [新消息]';
                                break;
                            }
                        };
                        
                    }
                     
                }
        
                // var bb = document.getElementById('blackboard')
                // var html = bb.innerHTML;
                // bb.innerHTML = html + '<br/>' + e.data;
            };
      
            s.onerror = function(e) {
                alert(e);
            };

            s.onclose = function(e) {
                s.send('{"u":"'+document.getElementById('myname').value+'","c":"e"}');
            };
          
            function invia() {
                var value = document.getElementById('testo').value;
                s.send(value);
            };

            function rename() {
                var value = document.getElementById('myname').value;
                s.send('{"u":"'+value+'","c":"rn"}');
            };
            function send_msg() {
                var value = document.getElementById('mymsg').value;
                document.getElementById('mymsg').value = '';
                s.send('{"m":"'+value.trim()+'","opp":"'+this_chater+'","c":"chat"}');
            };
            function send_by_enter(e) {
                var keynum;
                if(window.event) { // IE
                    keynum = e.keyCode;
                }
                else if(e.which) { // Netscape/Firefox/Opera
                    keynum = e.which;
                }
                if(keynum==13) {// && e.shiftKey) {
                    if(e.shiftKey) {
                        return '/n'
                    };
                    e.preventDefault();
                    send_msg();
                }
                return String.fromCharCode(keynum);
            };
            function select_chater(doc) {
                var all_users = document.getElementsByClassName('selected');
                for(index in all_users) {
                    all_users[index].className='users'; 
                };
                doc.className='selected';
                doc.innerHTML=doc.innerHTML.replace('    [新消息]','');
                this_chater=doc.getAttribute('coreid');
                
                var html = doc.innerHTML;
                var who = document.getElementById('who');
                who.innerHTML = html;

                var chatbox_obj = document.getElementById('chatbox');
                var old_chat_cont = room_chat_str[this_chater];
                if(typeof old_chat_cont == 'undefined') {
                    old_chat_cont = '';
                }
                chatbox_obj.innerHTML = old_chat_cont;
                chatbox_obj.scrollTop=chatbox_obj.value.length;

            
            };

        </script>
    </head>




    <body>
        <div id="container">
            <div id="header">
                <input type="text" id="myname"/>
                <input type="button" value="改名" onClick="rename();"/>
            </div>
            <div id="menu">
                <h2 class='selectd' coreid='ALL' onclick='select_chater(this);'>群聊天室</h2>
                <h2>在线玩家</h2>
                <ul id="userlist">
                </ul>
            </div>
            <!--<div id="blackboard" style="width:640px;height:480px;background-color:black;color:white;border: solid 2px red;overflow:auto">
            </div> -->
            <div id="chatwith">
                您正在与 <span id="who">群聊天室</span> 玩家聊天
            </div>
            <div id="chatcontent">
                <textarea readonly="readonly" id="chatbox"></textarea>
            </div>
            <div id="mychat">
               <textarea id="mymsg" onkeydown="return send_by_enter(event)"></textarea> 
               <button onclick="send_msg();">发送</button> 
            </div>
        </div>
    </body>
</html>

