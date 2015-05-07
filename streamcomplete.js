(function ($, count, window) {
    
    var ef = function () {},
    methods = {
        init: function (opts) {
            var T = this;
            if (!T.length || T.data('streamcomplete')) {
                // There are no elements or this object has already been initialised
                return T;
            } else if (T.length > 1) {
                T.each(function () {
                    $(this).streamComplete(opts);
                });
                return T;
            }
            var data = {
                instanceid: ++count,
                s: $.fn.extend({
                    delay: 250,
                    minlength: 2,
                    onajaxerror: ef,
                    onbeforeajaxsearch: ef,
                    onbeforesearch: ef,
                    onchange: ef,
                    onclose: ef,
                    onerror: ef,
                    onfocusin: ef,
                    onfocusout: ef,
                    oninit: ef,
                    onresponse: ef,
                    onresulthover: ef,
                    onsearch: ef,
                    src: []
                }, opts),
                searchterm: null
            },
            searchinterval = false,
            clear = false,
            keycodes = {
                DOWN: 40,
                ENTER: 13,
                SPACE: 32,
                TAB: 9,
                UP: 38
            };
            
            /**
             * Render a single result
             * @param {object(plain)} desc An object with necessary properties. The obejct MUST have the properties 'id' and 'value'
             * @returns {Element} The rendered element, in this case a div
             */
            data.renderResult = function (desc) {
                var elem = document.createElement('div');
                $(elem).html(desc.value).data('sc-desc', desc).addClass('streamcomplete-result');
                return elem;
            };
            
            /**
             * Render the full autocomplete
             * @param {array} results An array of objects in the form [{id: int, value: value}, ...], or an array of values
             */
            data.render = function (results) {
                var output = $('.streamcomplete-body').show(),
                rect = T[0].getBoundingClientRect();
                output.css({width: T.width(), top: rect.bottom, left: rect.left}).empty();
                for (var i = 0; results ? i < results.length : 0; i++) {
                    var desc = results[i];
                    if (Object.prototype.toString.call(desc) !== '[object Object]') {
                        // The result is not an object, make it one
                        desc = {id: i, value: desc};
                    }
                    var res = data.renderResult(desc);
                    output.append(res);
                }
            };
            
            /**
             * The after render function. Seperate from the render function because the render function can be customised, whereas 
             *  everything in this function is more or less always required. Makes customising the output easier
             */
            data.afterRender = function () {
                var output = $('.streamcomplete-body'),
                results = output.data('sc-results');
                output.data('sc-results', results);
                $('body').unbind('click.streamcomplete').bind('click.streamcomplete', data.close);
            };
            
            /**
             * 
             * @param {type} e
             */
            data.close = function (e) {
                var selection = null;
                if (e) {
                    // This function was called as a result of an event
                    var target = $(e.target);
                    if (target.closest('.streamcomplete-body').length) {
                        // The user has clicked on one of the selections
                        var selection = target.data('sc-desc');
                        T[0].value = selection.value;
                        T.attr({'data-value': selection.id});
                    }
                }
                data.s.onclose.call(T, {selection: selection, results: $('.streamcomplete-body').hide().data('sc-results')});
            };
            
            T.keyup(function (e) {
                if (inObj(keycodes, e.which)) {
                    // The user is navigating using the keyboard
                    e.preventDefault();
                    keyboardAction(e.which);
                    return false;
                }
                data.searchterm = this.value;
                var payload = {
                    term: data.searchterm
                };
                if (data.s.onbeforesearch.call(T, payload) === false) {
                    // The caller cancelled the search: return
                    return false;
                }
                if (this.value.length >= +data.s.minlength) {
                    clear = false;
                    if (searchinterval !== false) {
                        // Clear the search interval
                        window.clearTimeout(searchinterval);
                    }
                    searchinterval = window.setTimeout(function () {
                        // Only perform searches in intervals as specified by the settings
                        if (clear) {
                            // A clear was called during the timeout
                            clear = false;
                            return;
                        }
                        switch (Object.prototype.toString.call(data.s.src)) {
                            case '[object String]':
                                getDataAjax(data.s.src, payload);
                                break;
                            case '[object Array]':
                                data.render(data.s.src);
                                data.afterRender();
                                break;
                            case '[object Function]':
                                data.render(data.s.src());
                                data.afterRender();
                                break;
                        }
                    }, +data.s.delay);
                } else {
                    // No need to show the results because they are now wrong
                    clear = true;
                    data.close();
                }
                T.data('streamcomplete', data);
            });
            
            /**
             * Get data for the autocomplete via AJAX
             * @param {string} url The url to get the AJAX results from
             * @param {object(plain)} payload The payload to pass to as post data
             */
            var getDataAjax = function (url, payload) {
                $.ajax({
                    url: url,
                    type: 'post',
                    dataType: 'json',
                    beforeSend: function (e) {
                        data.s.onbeforeajaxsearch.call(T, e);
                    },
                    data: {payload: JSON.stringify(payload)}
                }).done(function (e) {
                    if (e.result === 'OK') {
                        if (clear) {
                            // A clear was called during the request
                            clear = false;
                            return;
                        }
                        data.s.onresponse.call(T, e);
                        searchinterval = false;
                        data.render(e.data);
                        data.afterRender();
                    } else {
                        data.s.onerror.call(T, e);
                    }
                }).fail(function (e) {
                    data.s.onajaxerror.call(T, e);
                });
            };
            
            /**
             * Perform a strict comparison with object values to determine whether a value exists in an object
             * @param {object} obj The object to look in
             * @param {mixed} val  The value to search for
             * @returns {Boolean} <b>True</b> if the value is in the object
             */
            var inObj = function (obj, val) {
                for (var x in obj) {
                    if (obj[x] === val) {
                        return true;
                    }
                }
                return false;
            };
            
            var keyboardAction = function (which) {
                switch (which) {
                    case keycodes.UP:
                    case keycodes.DOWN:
                    case keycodes.SPACE:
                    case keycodes.ENTER:
                    case keycodes.TAB:
                }
            };
            
            // Catch all focusin events
            T.focusin(data.s.onfocusin);
            T.change(data.s.onchange);
            T.focusout(data.onfocusout);
            T.data('streamcomplete', data);
            draw();
            data.s.oninit.call(T);
            return T;
        }
    };
    
    /**
     * 
     * @returns {undefined}
     */
    function draw() {
        if ($('.streamcomplete-body').length) {
            // The body has already been drawn
            return;
        }
        $('body').append('<div class="streamcomplete-body"></div>');
    }
    
    $.fn.streamComplete = function(methodOrOpts) {
        var T = this;
        if (methods[methodOrOpts]) {
            // The first option passed is a method, therefore call this method
            return methods[methodOrOpts].apply(T, Array.prototype.slice.call(arguments, 1));
        } else if (Object.prototype.toString.call(methodOrOpts) === '[object Object]' || !methodOrOpts) {
            // The default action is to call the init function
            return methods.init.apply(T, arguments);
        } else {
            // The user has passed us something dodgy, throw an error
            $.error(['The method ', methodOrOpts, ' does not exist'].join(''));
        }
    };
    
})(jQuery, 0, this);