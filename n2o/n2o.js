var msg = 0;
var ws;
var utf8 = {};

WebSocket = undefined;

function addStatus(text){
    var date = new Date();
    if (document.getElementById('n2ostatus')) {
        document.getElementById('n2ostatus').innerHTML =
            document.getElementById('n2ostatus').innerHTML + "E> " + text + "<br/>";
    }
}

utf8.toByteArray = function(str) {
    var byteArray = [];
    if (str !== undefined && str !== null)
    for (var i = 0; i < str.length; i++)
        if (str.charCodeAt(i) <= 0x7F)
            byteArray.push(str.charCodeAt(i));
        else {
            var h = encodeURIComponent(str.charAt(i)).substr(1).split('%');
            for (var j = 0; j < h.length; j++)
                byteArray.push(parseInt(h[j], 16));
        }
    return byteArray;
};

function WebSocketsInit(){
    if ("MozWebSocket" in window) { WebSocket = MozWebSocket; }
    if ("WebSocket" in window) {
        ws = new bullet("ws://"+
          (null == transition.host ? window.location.hostname : transition.host)
               + ":"+ (null == transition.port ? window.location.port : transition.port)
             + "/ws" + window.location.pathname + window.location.search);
        initialized = false;
        ws.onmessage = function (evt) {

            msg = JSON.parse(evt.data);
            var O = msg;

            if (typeof handle_web_socket == 'function' && O.data) {
                addStatus("Received: " + Bert.decodebuf(O.data));
                handle_web_socket(O.data);
            }

            if (O.eval) {
                try{eval(O.eval);}catch(e){console.log(e); console.log(O.eval);};
                addStatus("Evaluate: " + O.eval);
            }

        };
        ws.onopen = function() { if (!initialized) { ws.send(['N2O', transition.pid]); initialized = true; } };
        ws.onclose = function() { addStatus("websocket was closed"); };
    } else {
        addStatus("sorry, your browser does not support websockets.");
    }
}

WebSocketsInit();

