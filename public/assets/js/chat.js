var vent = $("#vent");
var listen = $("#listen");
vent.onclick = function() {
    renderchatpage(true);
}

listen.onclick = function() {
    renderchatpage(false);
}

function renderchatpage(chattype) {
    console.log(chattype);
    $("article").remove();

    $('<div class="logwrapper" style="top: 81px;"><div class="logbox"><div id="box" style="position: relative; min-height: 100%;"><div class="logitem"><p class="statuslog">Connecting...</p></div></div></div></div><div class="controlwrapper"><table class="controltable" cellpadding="0" cellspacing="0" border="0"><tbody><tr><td class="chatmsgcell"><div class="chatmsgwrapper"><textarea id="chatmsg" cols="80" rows="3" disabled></textarea></div></td><td class="sendbthcell"><div class="sendbtnwrapper"><button id="sendbtn">Send<div class="btnkbshortcut">Enter</div></button></div></td></tr></tbody></table></div>').insertAfter('.l-header');
    $('.l-site-header').css("width", "auto");
    var socket = io.connect('http://lyssner.arunmahadevan.me/');

    // Immediately after connecting, identify as a listener or a venter
    // true is venter
    // false is listener
    socket.emit( 'identify', { 'chattype': chattype } );

    var txt = "";
    var typing = false;
    var timeout = undefined;

    function timeoutFunction() {
        typing = false;
        socket.emit('stoppedtyping', {
            message: 'Stranger has entered text.'
        });
    }

    socket.on('entrance', function (data) {
        $(".logitem").replaceWith('<div class="logitem"><p class="statuslog">' + data.message + '</p></div>');
    });

    socket.on('foundpartner', function (data) {
        $(".logitem").replaceWith('<div class="logitem"><p class="statuslog">' + data.message + '</p></div>');
        document.getElementById("chatmsg").disabled = false;
        $("#chatmsg").focus();
    });

    
    socket.on('exit', function (data) {
        $("#box")
            .innerHTML += '<div class="logitem"><p class="statuslog">' + data.message + '</p></div>';
        $(".logbox").scrollTop($(".logbox")[0].scrollHeight);
        document.getElementById("chatmsg").setAttribute("disabled", "true");
    });

    socket.on('is typing', function (data) {
        if (document.getElementById("typing")) {
            $("#typing").replaceWith('<div class="logitem" id="typing"><p class="statuslog">' + data.message + '...</p></div>');
            $(".logbox")
                .scrollTop($(".logbox")[0].scrollHeight);
        } else {
            $("#box")
                .innerHTML += '<div class="logitem" id="typing"><p class="statuslog">' + data.message + '...</p></div>';
            $(".logbox")
                .scrollTop($(".logbox")[0].scrollHeight);
        }
    });

    socket.on('clearedtextfield', function () {
        $("#typing").remove();
        clearTimeout(timeout);
    })

    socket.on('stopped', function (data) {
        $("#typing").replaceWith('<div class="logitem" id="typing"><p class="statuslog">' + data.message + '</p></div>');
        $(".logbox")
            .scrollTop($(".logbox")[0].scrollHeight);
    });
    socket.on('chat', function (data) {
        $("#typing")
            .remove();
        $("#box")
            .innerHTML += '<div class="logitem"><p class="strangermsg"><strong class="msgsource">Stranger:</strong> <span>' + data.message +
            "</span></p></div>";
        $(".logbox")
            .scrollTop($(".logbox")[0].scrollHeight)
    });




    function input() {
        txt = document.getElementById("chatmsg").value;
        txt = txt.replace(/^\s+|\s+$/g, "");
        var escaped = escapeHtml(txt);
        document.getElementById("chatmsg")
            .value = "";
        var new_div = document.createElement("div");
        new_div.className = "logitem";
        new_div.innerHTML = '<p class="youmsg"><strong class="msgsource">You:</strong> <span>' + escaped + "</span></p>";
        if (document.getElementById("typing")) {
            document.getElementById("box").insertBefore(new_div, document.getElementById("typing"));
            $(".logbox")
                .scrollTop($(".logbox")[0].scrollHeight)
        } else {
            document.getElementById("box")
                .innerHTML +=
                '<div class="logitem"><p class="youmsg"><strong class="msgsource">You:</strong> <span>' + escaped + "</span></p></div>";
            $(".logbox").scrollTop($(".logbox")[0].scrollHeight);
        }
    }

    document.getElementById("sendbtn")
        .onclick = function () {
            $("#chatmsg")
                .focus();
            typing = false;
            clearTimeout(timeout);
            txt = document.getElementById("chatmsg").value;
            txt = txt.replace(/^\s+|\s+$/g, "");
            var escaped = escapeHtml(txt);
            if ($("#chatmsg")
                .val()
                .match(/^\s*$/));
            else {
                input();
                socket.emit('chat', {
                    message: escaped
                });
            }
    };

    $("#chatmsg")
        .keypress(function (e) {
            if (e.keyCode != 13) {
                if (typing == false) {
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




            if ($(this)
                .val()
                .match(/^\s*$/) && e.keyCode == 13 && !e.shiftKey) e.preventDefault();
            else if (e.keyCode == 13 && !e.shiftKey) {
                typing = false;
                clearTimeout(timeout);
                e.preventDefault();
                txt = document.getElementById("chatmsg").value;
                txt = txt.replace(/^\s+|\s+$/g, "");
                var escaped = escapeHtml(txt);
                input();
                socket.emit('chat', {
                    message: escaped
                });
                document.getElementById("chatmsg")
                    .value = "";
            }
        });

    $("#chatmsg").keyup(function () {
        if ($(this).val() == "") {
            socket.emit('clearedtextfield');
            typing = false;
        }
    });

};
var hex = new Array("0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f");

function escapeHtml(originalText) {
    var preescape = "" + originalText;
    var escaped = "";
    var i = 0;
    for (i = 0; i < preescape.length; i++) {
        var p = preescape.charAt(i);
        p = "" + escapeCharOther(p);
        p = "" + escapeTags(p);
        p = "" + escapeBR(p);
        escaped = escaped + p
    }
    return escaped
}

function escapeHtmlTextArea(originalText) {
    var preescape = "" + originalText;
    var escaped = "";
    var i = 0;
    for (i = 0; i < preescape.length; i++) {
        var p = preescape.charAt(i);
        p = "" + escapeCharOther(p);
        p = "" + escapeTags(p);
        escaped = escaped + p
    }
    return escaped
}

function escapeBR(original) {
    var thechar = original.charCodeAt(0);
    switch (thechar) {
    case 10:
        return "<br/>";
        break;
    case "\r":
        break
    }
    return original
}

function escapeNBSP(original) {
    var thechar = original.charCodeAt(0);
    switch (thechar) {
    case 32:
        return "&nbsp;";
        break
    }
    return original
}

function escapeTags(original) {
    var thechar = original.charCodeAt(0);
    switch (thechar) {
    case 60:
        return "&lt;";
        break;
    case 62:
        return "&gt;";
        break;
    case 34:
        return "&quot;";
        break
    }
    return original
}

function escapeCharOther(original) {
    var found = true;
    var thechar = original.charCodeAt(0);
    switch (thechar) {
    case 38:
        return "&amp;";
        break;
    case 198:
        return "&AElig;";
        break;
    case 193:
        return "&Aacute;";
        break;
    case 194:
        return "&Acirc;";
        break;
    case 192:
        return "&Agrave;";
        break;
    case 197:
        return "&Aring;";
        break;
    case 195:
        return "&Atilde;";
        break;
    case 196:
        return "&Auml;";
        break;
    case 199:
        return "&Ccedil;";
        break;
    case 208:
        return "&ETH;";
        break;
    case 201:
        return "&Eacute;";
        break;
    case 202:
        return "&Ecirc;";
        break;
    case 200:
        return "&Egrave;";
        break;
    case 203:
        return "&Euml;";
        break;
    case 205:
        return "&Iacute;";
        break;
    case 206:
        return "&Icirc;";
        break;
    case 204:
        return "&Igrave;";
        break;
    case 207:
        return "&Iuml;";
        break;
    case 209:
        return "&Ntilde;";
        break;
    case 211:
        return "&Oacute;";
        break;
    case 212:
        return "&Ocirc;";
        break;
    case 210:
        return "&Ograve;";
        break;
    case 216:
        return "&Oslash;";
        break;
    case 213:
        return "&Otilde;";
        break;
    case 214:
        return "&Ouml;";
        break;
    case 222:
        return "&THORN;";
        break;
    case 218:
        return "&Uacute;";
        break;
    case 219:
        return "&Ucirc;";
        break;
    case 217:
        return "&Ugrave;";
        break;
    case 220:
        return "&Uuml;";
        break;
    case 221:
        return "&Yacute;";
        break;
    case 225:
        return "&aacute;";
        break;
    case 226:
        return "&acirc;";
        break;
    case 230:
        return "&aelig;";
        break;
    case 224:
        return "&agrave;";
        break;
    case 229:
        return "&aring;";
        break;
    case 227:
        return "&atilde;";
        break;
    case 228:
        return "&auml;";
        break;
    case 231:
        return "&ccedil;";
        break;
    case 233:
        return "&eacute;";
        break;
    case 234:
        return "&ecirc;";
        break;
    case 232:
        return "&egrave;";
        break;
    case 240:
        return "&eth;";
        break;
    case 235:
        return "&euml;";
        break;
    case 237:
        return "&iacute;";
        break;
    case 238:
        return "&icirc;";
        break;
    case 236:
        return "&igrave;";
        break;
    case 239:
        return "&iuml;";
        break;
    case 241:
        return "&ntilde;";
        break;
    case 243:
        return "&oacute;";
        break;
    case 244:
        return "&ocirc;";
        break;
    case 242:
        return "&ograve;";
        break;
    case 248:
        return "&oslash;";
        break;
    case 245:
        return "&otilde;";
        break;
    case 246:
        return "&ouml;";
        break;
    case 223:
        return "&szlig;";
        break;
    case 254:
        return "&thorn;";
        break;
    case 250:
        return "&uacute;";
        break;
    case 251:
        return "&ucirc;";
        break;
    case 249:
        return "&ugrave;";
        break;
    case 252:
        return "&uuml;";
        break;
    case 253:
        return "&yacute;";
        break;
    case 255:
        return "&yuml;";
        break;
    case 162:
        return "&cent;";
        break;
    default:
        found = false;
        break
    }
    if (!found)
        if (thechar > 127) {
            var c = thechar;
            var a4 = c % 16;
            c = Math.floor(c / 16);
            var a3 = c % 16;
            c = Math.floor(c / 16);
            var a2 = c % 16;
            c = Math.floor(c / 16);
            var a1 = c % 16;
            return "&#x" + hex[a1] + hex[a2] + hex[a3] + hex[a4] + ";"
        } else return original
};
