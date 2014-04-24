// Make the html element editable :) (c) doxtop@synrc.com
function Htmlbox(id) {
  var settings = {class: "htmlbox", toolbarclass: ["htmlbox-toolbar", "nav", "nav-pills"],
    toolbar: [
      {title:'image',     cmd: {name:'insertHtml', tag:'wire_upload'},   icon: 'fa-picture-o' },
      {title:'bold',      cmd: {name:'Bold'}, icon:'fa-bold'},
      {title:'bold',      cmd: {name:'Bold'}},
      {title:'blockquote',cmd: {name:'formatBlock',arg:'blockquote'},icon:'fa-quote-right'},
      {title:'code',      cmd: {name:'formatBlock',arg:'pre'},      icon:'fa-code'}]};

  var $input = document.querySelector(id);
  var self = this;
  $input.setAttribute('contenteditable', true);
  $input.style.border='1px solid lightgrey';
  $input.addEventListener('exec', function(e){
    var cmd = e.detail.cmd;
    if(!cmd.arg) cmd.arg = null;if(!cmd.ui) cmd.ui = false;
    document.execCommand(cmd.name, cmd.ui, cmd.arg);
  });

  $input.classList.add(settings.class);

  var tb = document.createElement("ul"); tb.style.listStyleType='none';
  settings.toolbarclass.map(function(i) {tb.classList.add(i);});

  [].map.call(settings.toolbar, function(item){
    var icon = item.icon, cmd = item.cmd, event;
    var event = (cmd.tag) ? cmd.tag : 'exec';

    var li = document.createElement("li"); li.style.display='inline';
    var b = document.createElement("a");
    b.innerHTML=item.title;
    b.setAttribute('href', '#'); b.setAttribute('title', item.title); b.setAttribute('tabindex', -1);
    b.style.padding='0 1em';
    b.onfocus=function(e){e.stopPropagation()};
    b.onclick=function(e){dispatchEvent(event, cmd);};

    var i = document.createElement("i");
    if(icon) i.classList.add(icon);

    b.appendChild(i);
    li.appendChild(b);
    tb.appendChild(li);
  });

  $input.parentNode.insertBefore(tb, $input);

  var dispatchEvent = function(name, detail){
    $input.dispatchEvent(new CustomEvent(name, {'detail': {'cmd': detail }}));};
}
