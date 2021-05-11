# StreamComplete #
*A light jQuery autocomplete plugin*


----------


This plugin is an alternative to the jQuery UI version, useful if you don't need anymore of the UI features


----------

## Initialising ##

#### HTML ####

```html
<script type="text/javascript" src="/path/to/streamcomplete.js"></script>
<link rel="stylesheet" type="text/css" href="/path/to/streamcomplete.css">
```

```js
$(function () {
    $(selector).streamComplete({...});
});
```

##Options##

| Option | Default | Type | Description |
----------|-------|-------|----------------|
delay | 250 | integer (milliseconds) | The amount of seconds between each keystroke before a search is performed
minlength | 2 | integer | The amount of characters required before a search is performed. The default is set at two assuming that an Ajax request will be performed. If your data source has a lot of data, starting at 0 will increase load on your server
onajaxerror | function | function | Called when an XHR request fails whilst attempting to get data. `Param1` is the default error object as sent by jQuery
onbeforeajaxsearch | function | function | Actions to perform before the XHR request is made. `Param1` is the default XHR object as sent by jQuery
onbeforesearch | function | function | Actions to perform before a search is performed. This is different to `onbeforeajaxsearch` in that an XHR request object has not been created. Returning `false` here cancels the operation. `Param1` is a plain object with one property, term, which is the search term. Understanding how objects work, manipulating this object will allow you to send more data to the server than just `term` as a POST request
onclose | function | function | Called when the autocomplete box has closed. `Param1` is a plain object with two properties, `selection` and `results`. `selection` is another plain object with at least two properties, `id` and `value`. They describe the item that was selected. `results` is a jQuery collection of the containing `div` that the autocomplete results are in
onerror | function | function | Called when the reponse from the server was not 'OK'. `Param1` is the response object returned from the server. 
oninit | function | function | Called when the autocomplete has initialised. This callback has no arguments
onresponse | function | function | Called only when there is an 'OK' response from the server. `Param1` is the object returned by the server. Returning `false` cancels the operation
onsearch | function | function | Called whenever a search is performed, regardless of the source. `Param1` is the dataset. Returning `false` cancels the operation
onselect | function | function | Called when an item is selected from the autocomplete list. `Param1` is a plain object with at least two properties, `id` and `value`, a description of the item that was selected. Returning `false` cancels the operation
src | [] | mixed | **string**<br/> If a string is passed, the software will perform an XHR request. Your server is required to return JSON data with two properties, `result`, which should be 'OK' on success and `data`, which should be an array. Each array element can be a `string` or a plain object with at least one property, `value`. <br/><br/>**function**<br/>A function with two parameters. `Param1` is the searchterm, whereas `Param2` is the callback function to which to send back data to. The callback expects one parameter, an array of results.<br/><br/>**Array**<br/>A `string` or a plain object with at least one property, `value`
