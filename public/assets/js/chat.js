(function($, document) {
    'use strict';
    var vent = document.getElementById("vent");
    var listen = document.getElementById("listen");
    // Event handlers for home page
    vent.onclick = function() {
        renderchatpage(true);
    };

    listen.onclick = function() {
        renderchatpage(false);
    };

    function renderchatpage(chattype) {
        var txt = "";
        var typing = false;
        var timeout;
        var socket = io.connect(window.location.host, {'forceNew':true });
        var statsocket = io(window.location.host + '/stats');
        var unread = 0;
        var once = false;
        var twice = false;
        // for HTML escaping
        // copied from moustache.js
        var entityMap = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': '&quot;',
        "'": '&#39;',
        "/": '&#x2F;',
        "\n" : '<br>'
        };

        // To check if tab is active or not
        var vis = (function(){
            var stateKey, eventKey, keys = {
                hidden: "visibilitychange",
                webkitHidden: "webkitvisibilitychange",
                mozHidden: "mozvisibilitychange",
                msHidden: "msvisibilitychange"
            };
            for (stateKey in keys) {
                if (stateKey in document) {
                    eventKey = keys[stateKey];
                    break;
                }
            }
            return function(c) {
                if (c) document.addEventListener(eventKey, c);
                return !document[stateKey];
            };
        })();


        // DOM changes
        $("article").remove();
        $(".stats").css("display", "block");
        $('<div class="logwrapper" style="top: 81px;"><div class="logbox"><div id="box" style="position: relative; min-height: 100%;"><div class="logitem"><p class="statuslog">Connecting...</p></div></div></div></div><div class="controlwrapper"><table class="controltable" cellpadding="0" cellspacing="0" border="0"><tbody><tr><td class="disconnectbtncell"><div class="disconnectbtnwrapper newbtn"><button id="disconnectbtn">Disconnect<div class="btnkbshortcut">Esc</div></button></div></td><td class="chatmsgcell"><div class="chatmsgwrapper"><textarea id="chatmsg" cols="80" rows="3" disabled></textarea></div></td><td class="sendbthcell"><div class="sendbtnwrapper"><button id="sendbtn" disabled>Send<div class="btnkbshortcut">Enter</div></button></div></td></tr></tbody></table></div>').insertAfter('.l-header');
        $('.l-site-header').css("width", "auto");
        var notif = document.createElement('audio');
        notif.setAttribute('src', 'assets/media/notif.mp3');
        notif.setAttribute('preload', 'auto');

        // Socket events

        setUpChatEvents();

        statsocket.on('updatechatting', function (data) {
            document.getElementById("chatting").innerHTML = data.count;
        });

        statsocket.on('updateventer', function (data) {
            document.getElementById("ventcount").innerHTML = data.count;
        });

        statsocket.on('updatelistener', function (data) {
            document.getElementById("listencount").innerHTML = data.count;
        });

        // Event handlers
        vis(function(){
            if (vis() && unread !== 0) {
                unread = 0;
                document.title = "Lyssner | Vent your heart out";
            }
        });

        document.getElementById("sendbtn").onclick = function () {
            if (!($("#chatmsg").is(':disabled'))) {
                $("#chatmsg").focus();
                typing = false;
                clearTimeout(timeout);
                txt = document.getElementById("chatmsg").value;
                if (!($("#chatmsg").val().match(/^\s*$/))) {
                    input(txt);
                }
            }
        };

        document.getElementById("disconnectbtn").onclick = disconnect;


        $(document).keyup(function (e) {
            if (e.keyCode == 27) {
                disconnect();
            }
        });

        $("#chatmsg").keypress(function (e) {
            if (e.keyCode != 13) {
                if (typing === false) {
                    typing = true;
                    socket.emit('typing', {
                        message: 'Stranger is typing'
                    });
                    timeout = setTimeout(timeoutFunction, 3000);
                } else {
                    clearTimeout(timeout);
                    timeout = setTimeout(timeoutFunction, 3000);
                }
            }

            if ($(this).val().match(/^\s*$/) && e.keyCode == 13 && !e.shiftKey)
                e.preventDefault();
            else if (e.keyCode == 13 && !e.shiftKey) {
                typing = false;
                clearTimeout(timeout);
                e.preventDefault();
                txt = document.getElementById("chatmsg").value;
                input(txt);
                document.getElementById("chatmsg").value = "";
            }
        });

        $("#chatmsg").keyup(function () {
            if ($(this).val() === "") {
                socket.emit('clearedtextfield');
                typing = false;
            }
        });

        function setUpChatEvents () {
            socket.emit( 'identify', { 'chattype': chattype } );

            socket.on('entrance', function (data) {
                $(".logitem").replaceWith('<div class="logitem"><p class="statuslog">' + data.message + '</p></div>');
            });

            socket.on('foundpartner', function (data) {
                $(".logitem").replaceWith('<div class="logitem"><p class="statuslog">' + data.message + '</p></div>');
                window.onbeforeunload = function(){ return 'A chat is still in progress.'; };
                document.getElementById("chatmsg").disabled = false;
                document.getElementById("sendbtn").disabled = false;
                $("#chatmsg").focus();
            });

            
            socket.on('exit', function (data) {
                window.onbeforeunload = null;
                document.getElementById("box").innerHTML += '<div class="logitem"><p class="statuslog">' + data.message + '</p></div>';
                $(".logbox").scrollTop($(".logbox")[0].scrollHeight);
                socket.disconnect();
                document.getElementById("chatmsg").disabled = true;
                document.getElementById("sendbtn").disabled = true;
                document.getElementById("disconnectbtn").innerHTML = 'New Chat<div class="btnkbshortcut">Esc</div>';
                twice = true;
                once = true;
            });

            socket.on('is typing', function (data) {
                if (document.getElementById("typing")) {
                    $("#typing").replaceWith('<div class="logitem" id="typing"><p class="statuslog">' + data.message + '...</p></div>');
                    $(".logbox").scrollTop($(".logbox")[0].scrollHeight);
                } else {
                    document.getElementById("box").innerHTML += '<div class="logitem" id="typing"><p class="statuslog">' + data.message + '...</p></div>';
                    $(".logbox").scrollTop($(".logbox")[0].scrollHeight);
                }
            });

            socket.on('clearedtextfield', function () {
                $("#typing").remove();
                clearTimeout(timeout);
            });

            socket.on('stopped', function (data) {
                $("#typing").replaceWith('<div class="logitem" id="typing"><p class="statuslog">' + data.message + '</p></div>');
                $(".logbox").scrollTop($(".logbox")[0].scrollHeight);
            });

            socket.on('chat', function (data) {
                $("#typing").remove();
                document.getElementById("box").innerHTML += '<div class="logitem"><p class="strangermsg"><strong class="msgsource">Stranger:</strong> <span>' + data.message + "</span></p></div>";
                $(".logbox").scrollTop($(".logbox")[0].scrollHeight);
                if (!vis()) {
                    notif.play();
                    unread++;
                    document.title = "(" + unread + ") Lyssner | Vent your heart out";
                }
            });
        }

        function timeoutFunction() {
            typing = false;
            socket.emit('stoppedtyping', {
                message: 'Stranger has entered text.'
            });
        }

        function input(txt) {
            txt = txt.replace(/^\s+|\s+$/g, "");
            var escaped = escapeHtml(txt);
            document.getElementById("chatmsg").value = "";
            var new_div = document.createElement("div");
            new_div.className = "logitem";
            new_div.innerHTML = '<p class="youmsg"><strong class="msgsource">You:</strong> <span>' + escaped + "</span></p>";
            if (document.getElementById("typing")) {
                document.getElementById("box").insertBefore(new_div, document.getElementById("typing"));
                $(".logbox").scrollTop($(".logbox")[0].scrollHeight);
            } 
            else {
                document.getElementById("box").innerHTML += '<div class="logitem"><p class="youmsg"><strong class="msgsource">You:</strong> <span>' + escaped + "</span></p></div>";
                $(".logbox").scrollTop($(".logbox")[0].scrollHeight);
            }
            socket.emit('chat', {
                message: escaped
            });
        }

        function disconnect () {
            if (!once) {
                document.getElementById("disconnectbtn").innerHTML = 'Sure?<div class="btnkbshortcut">Esc</div>';
                once = true;
            }
            else if (once && !twice) {
                document.getElementById("box").innerHTML += '<div class="logitem"><p class="statuslog">You have disconnected.</p></div>';
                socket.disconnect();
                document.getElementById("disconnectbtn").innerHTML = 'New Chat<div class="btnkbshortcut">Esc</div>';
                $(".logbox").scrollTop($(".logbox")[0].scrollHeight);
                window.onbeforeunload = null;
                document.getElementById("chatmsg").disabled = true;
                document.getElementById("sendbtn").disabled = true;
                twice = true;
            }
            else {
                once = false;
                twice = false;
                document.getElementById("chatmsg").value = "";
                document.getElementById("disconnectbtn").innerHTML = 'Disconnect<div class="btnkbshortcut">Esc</div>';
                document.getElementById("box").innerHTML = '<div class="logitem"><p class="statuslog">Connecting...</p></div>';
                socket = io.connect({forceNew: true});
                setUpChatEvents();
            }
        }


        function escapeHtml(string) {
            return String(string).replace(/[&<>"'\/]|[\n]/g, function (s) {
                return entityMap[s];
            });
        }
    }
}(window.jQuery, document));
 