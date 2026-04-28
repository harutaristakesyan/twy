function _handler(event) {
  var request = event.request;
  var uri = request.uri;
  var headers = request.headers;

  // Remove 'www.' if present
  if (headers.host?.value.startsWith("www.")) {
    var newHost = headers.host.value.slice(4);
    return {
      statusCode: 301,
      statusDescription: "Moved Permanently",
      headers: {
        location: {
          value: `https://${newHost}${uri}`,
        },
      },
    };
  }

  if (uri.startsWith("/logos/")) return request;

  if (uri.endsWith("/")) {
    request.uri += "index.html";
  } else if (!uri.includes(".")) {
    request.uri += ".html";
  }

  return request;
}
