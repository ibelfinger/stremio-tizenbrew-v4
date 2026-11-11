// Dev-only bridge: the TV has no devtools here, so ship logs to a LAN host and run JS it queues.
// Remove before calling this finished.
(function () {
  var HOST = 'http://192.168.70.4:8765';
  function post(path, body) {
    try { var x = new XMLHttpRequest(); x.open('POST', HOST + path, true); x.send(body); } catch (e) {}
  }
  function str(a) {
    if (a instanceof Error) return a.message + '\n' + a.stack;
    if (typeof a === 'string') return a;
    try { return JSON.stringify(a); } catch (e) { return String(a); }
  }
  ['log', 'warn', 'error'].forEach(function (lvl) {
    var orig = console[lvl];
    console[lvl] = function () {
      post('/log', lvl + ': ' + [].map.call(arguments, str).join(' '));
      return orig.apply(console, arguments);
    };
  });
  window.addEventListener('error', function (e) {
    post('/log', 'ERROR: ' + e.message + ' @ ' + e.filename + ':' + e.lineno + ':' + e.colno + (e.error && e.error.stack ? '\n' + e.error.stack : ''));
  });
  window.addEventListener('unhandledrejection', function (e) { post('/log', 'REJECTION: ' + str(e.reason)); });
  post('/log', 'BOOT ' + navigator.userAgent + ' ' + location.href);

  function poll() {
    var x = new XMLHttpRequest();
    x.open('GET', HOST + '/cmd', true);
    x.onload = function () {
      if (x.responseText) {
        var out;
        try { out = str((0, eval)(x.responseText)); } catch (e) { out = 'THROW: ' + str(e); }
        post('/result', out);
      }
      setTimeout(poll, 500);
    };
    x.onerror = function () { setTimeout(poll, 3000); };
    x.send();
  }
  poll();
})();
