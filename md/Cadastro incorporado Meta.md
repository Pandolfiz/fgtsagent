SDK do JavaScript
JavaScript assíncrono
<script>
  window.fbAsyncInit = function() {
    FB.init({
      appId            : '980766987152980',
      autoLogAppEvents : true,
      xfbml            : true,
      version          : 'v23.0'
    });
  };

  // Load the JavaScript SDK asynchronously
  (function (d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'facebook-jssdk'));
</script>
