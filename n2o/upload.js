function Upload(id, options){
  if (!(window.File && window.FileReader && window.FileList && window.Blob)) return false;

  var $input = document.querySelector(id);
  var self = this;
  var pid, reader, cancelled, paused, start_time, file, file_index = 0, start_file_index;
  var block_size = 1048576;
  if (options.block_size) block_size = options.block_size;

  var dispatchEvent = function(name, detail){$input.dispatchEvent(new CustomEvent(name, {'detail': detail})); };
  var hide_btns = function(){for(var i=0; i< file_btns.length;++i){file_btns[i].style.display='none';}};
  var create_btn= function(title,html, clazz){
    var btn = document.createElement('a');btn.setAttribute('href', '#');btn.title=title;btn.innerHTML=html;
    var i = document.createElement('i'); i.className=clazz;
    btn.appendChild(i);
    return btn;};
  var create_el = function(tag, clazz){
    var el = document.createElement(tag);el.className=clazz;return el;};
  var append_children = function(parent, children){for(var i=0; i < children.length;i++){parent.appendChild(children[i]);};};

  var update_preview = function(){
    preview.innerHTML='';

    if(file.type.match('image')){
      reader = new FileReader();
      reader.onload = (function(f){ return function(e){
        var img = document.createElement('img');img.setAttribute('src', e.target.result);img.title=f.name;
        preview.appendChild(img);
      };})(file);
      reader.readAsDataURL(file);
    }
  };

  var reset_upload = function(){
    hide_btns();
    browse_btn.style.display='block';
    cancelled = false;
    paused = false;
    preview.innerHTML='';
    info.innerHTML='';
    progress_label.innerHTML='';
    progress_bar.style.width="0";
    $input.value='';
  };

  var begin_upload = function(){
    hide_btns();
    pause_btn.style.display='block';
    cancel_btn.style.display='block';
    progress_label.innerHTML='';
    start_time = Date.now();
    start_file_index = file_index;

    if (paused) paused = false;
    var type = (file.type === "") ? atom('undefined') : bin(file.type);
    dispatchEvent("start_upload", {'file_name': bin(file.name), 'type': type, 'index': file_index});
  };

  var read_slice = function(start, end)   {
    reader = new FileReader();
    reader.onabort = onabort;
    reader.onerror = onerror;
    reader.onloadend = onloadend;
    var blob = file.slice(start, end);
    reader.readAsBinaryString(blob);
  };

  var onloadend = function(e){
    if(e.target.readyState == FileReader.DONE){
      dispatchEvent('deliver', {'pid': utf8.toByteArray(self.pid), 'data': bin(e.target.result)})
    }
  };

  var update_progress_bar = function(){
    var progress = Math.floor(100* (file_index / file.size));
    if(progress_bar && progress_bar.style.width !== progress+'%'){
      dispatchEvent('progress_changed', {'progress':progress});
    }
  };

  var calculate_eta = function(){
    var delta_ms = Date.now() - start_time;
    var rate = (file_index- start_file_index) / delta_ms;

    var remaining_ms = (file.size - file_index) / rate;
    if(remaining_ms < 0) return;

    var delta_hr = parseInt(Math.floor(remaining_ms/3600000));
    remaining_ms -= delta_hr*3600000;
    var delta_min = parseInt(Math.floor(remaining_ms/60000));
    remaining_ms -= delta_min*60000;
    var delta_sec = parseInt(Math.floor(remaining_ms/1000));
    var eta = "";
    if (delta_sec>=0) eta = delta_sec + 1 + " secs";
    if (delta_min>0) eta = delta_min + " mins";
    if (delta_hr>0) eta = delta_hr + " hours";
    etainfo.innerHTML=eta;
  };


  $input.addEventListener('change',function(e){
    file = this.files[0];
    if(!file) return;

    info.innerHTML=file.name;
    progress_label.innerHTML='';

    hide_btns();

    browse_btn.style.display='block';
    upload_btn.style.display='inline-block';
    cancel_btn.style.display='block';

    progress_bar.style.width="0";

    if(options.preview=='true') update_preview();

    dispatchEvent("query_file", {'file_name': bin(file.name)});
  });

  $input.addEventListener('queried', function(e){
    var size = parseInt(e.detail.file_size);
    file_index = 0;

    if (size>0) {
      file_index = size;
      hide_btns();

      reupload_btn.style.display='block';
      cancel_btn.style.display='block';

      if (file_index < file.size) {
        resume_btn.style.display='block';
        progress_label.innerHTML='Upload incomplete';
      } else {
        progress_label.innerHTML='File exists';
      }
      update_progress_bar();
    }
  });

  $input.addEventListener('read_slice', function(e){
    self.pid = e.detail.pid;
    read_slice(file_index, file_index + block_size);
  });

  $input.addEventListener('delivered', function(e){
    var size = parseInt(e.detail.file_size);
    file_index += block_size;

    if (!paused && !cancelled && file_index<file.size) {
      read_slice(file_index, file_index + block_size);
    }

    if (paused) progress_label.innerHTML='';
    if (cancelled) {
        reset_upload();
        progress_label.innerHTML='';
    }
    calculate_eta();
    update_progress_bar();
    if (file_index >= file.size){
      for(var i=0; i< file_btns.length;++i){file_btns[i].style.display='none';}
      browse_btn.style.display='block';
      progress_label.innerHTML='Upload complete';
      etainfo.innerHTML='';
      dispatchEvent('complete', {'pid': bin(self.pid)});
    }
  });

  $input.addEventListener('error', function(e){ error(e.detail.msg); });
  $input.addEventListener('reset', reset_upload);
  $input.addEventListener('progress_changed', function(e){progress_bar.style.width=e.detail.progress + "%";});
  $input.addEventListener('complete_replace', function(e){
    var im = document.createElement('img');
    im.setAttribute('src',  e.detail.file);
    im.style.width='100%';
    var pa = this.parentNode;
    pa.removeChild(this.previousSibling);
    pa.replaceChild(im, this);
  });

  var browse_btn = create_btn('browse', 'browse', 'fi-browse');
  browse_btn.addEventListener('click', function(e){$input.click(); e.preventDefault();}, false);

  var upload_btn = create_btn('Upload', 'upload', 'fi-upload');
  upload_btn.onclick=begin_upload;

  var reupload_btn= create_btn('Reupload', 'reupload', 'fi-reupload');
  reupload_btn.onclick=function(){file_index = 0;begin_upload();};

  var resume_btn = create_btn('Resume', 'resume', 'fi-resume');
  resume_btn.onclick=begin_upload;

  var cancel_btn = create_btn('Cancel', 'cancel', 'fi-cancel');
  cancel_btn.onclick= function(){
    reset_upload();
    progress_label.innerHTML='';
    cancelled=true;
    preview.innerHTML='';
  };

  var pause_btn = create_btn('Pause', 'pause', 'fi-pause');
  pause_btn.onclick= function () {
    paused=true;
    pause_btn.style.display='none';
    resume_btn.style.display='block';
    progress_label.innerHTML='';
    dispatchEvent('complete', {'pid': bin(self.pid)});
  };

  var etainfo = create_el('span','info');
  var info =    create_el('span','info');
  var preview = create_el('div','preview');
  var progress_ctl = create_el('div', 'progress-ctl');
  append_children(progress_ctl, [upload_btn, pause_btn, resume_btn, reupload_btn]);

  var progress_label = document.createElement('span');
  var progress_bar = create_el('div', 'progress-bar progress-bar-info');
  progress_bar.setAttribute('role', 'progressbar');
  progress_bar.setAttribute('aria-valuemin', '0');
  progress_bar.setAttribute('aria-valuemax', '100');
  append_children(progress_bar, [progress_label, progress_ctl]);

  var progress = create_el('div', 'progress progress-striped');
  progress.appendChild(progress_bar);

  var ctl = create_el('div', 'ctl');
  append_children(ctl, [cancel_btn, info, etainfo, browse_btn]);

  var fu = create_el('div','file_upload'); fu.setAttribute('contenteditable', false);
  append_children(fu, [preview, progress, ctl])

  $input.parentNode.insertBefore(fu, $input);

  if(options.value !== "undefined") preview.innerHTML("<img src='"+ options.value +"'/>");

  var file_btns = fu.querySelectorAll("a");

  var error = function(message){
    reset_upload();

    var close = create_el('button', 'close');
    close.setAttribute('type', 'button');
    close.setAttribute('data-dissmiss', 'alert');
    close.innerHTML("&times;");

    var alrt = create_el('div', 'alert alert-error');
    append_children(alrt, [close, message]);

    $input.parentNode.appendChild(alrt);
    var bar = $input.parentNode.querySelector('.progress-bar-info');
    bar.classList.remove('progress-bar-info');
    bar.classList.add('progress-bar-danger');

    progress_bar.style.width="100%";
    progress_label.innerHTML(message);
  };

  var onabort = function(event){ error('File upload aborted'); reader.abort();};

  var onerror = function(e){
    switch(e.target.error.code) {
      case e.target.error.NOT_FOUND_ERR:    error('File not found');       break;
      case e.target.error.NOT_READABLE_ERR: error('File is not readable'); break;
      case e.target.error.ABORT_ERR:        error('File upload aborted');  break;
      default: error('An error occurred reading the file.');};
  };

  reset_upload();
}

