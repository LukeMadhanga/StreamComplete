(function ($, count) {
    "use strict";
    var ajax = null,
        ef = function () {return;},
        methods = {
            init: function (opts) {
                var T = this,
                    data = {
                        instanceid: ++count,
                        results: [],
                        s: $.fn.extend({
                            delay: 250,
                            minlength: 2,
                            // class names added to the .streamcomplete-body
                            classnames: [],
                            clearonemptysearch: false,  // False for legacy purposes
                            appendto: 'body',
                            onajaxerror: ef,
                            onbeforeajaxsearch: ef,
                            onbeforesearch: ef,
                            onclose: ef,
                            onerror: ef,
                            onemptysearchclear: ef,
                            onfocusout: ef,
                            onfocusin: ef,
                            oninit: ef,
                            onopen: ef,
                            onresponse: ef,
                            onsearch: ef,
                            onselect: ef,
                            preprocessresults: null,
                            requestmethod: 'post',
                            src: [],
                            usestandardsyntax: false    // True to use standard syntax. Defaults to false for legacy purposes
                        }, opts),
                        searchterm: null,
                        keyboard: {
                            selectpos: -1
                        },
                        outputelement: null
                    },
                    searchinterval = false,
                    clear = false,
                    keycodes = {
                        LEFT: 37,
                        RIGHT: 39,
                        DOWN: 40,
                        ENTER: 13,
                        SPACE: 32,
                        TAB: 9,
                        UP: 38,
                        ESC: 27,
                        SHIFT: 16
                    },
                    cancelkeypress = false;

                if (!T.length || T.data('streamcomplete')) {
                    // There are no elements or this object has already been initialised
                    return T;
                }

                if (T.length > 1) {
                    T.each(function () {
                        $(this).streamComplete(opts);
                    });
                    return T;
                }

                /**
                 * Render a single result
                 * @param {object(plain)} desc An object with necessary properties. The obejct MUST have the properties 'id' and 'value'
                 * @returns {Element} The rendered element, in this case a div
                 */
                data.renderResult = function (desc) {
                    var elem = document.createElement('div');
                    $(elem).html(desc.label).data('sc-desc', desc).addClass('streamcomplete-result');
                    return elem;
                };

                /**
                 * Render the full autocomplete
                 * @param {array} results An array of objects in the form [{id: int, value: value}, ...], or an array of values
                 */
                data.render = function (results) {
                    var output,
                        offset = T.offset(),
                        rect = $.extend({}, T[0].getBoundingClientRect()),
                        outputbounds = { width: rect.width, top: offset.top + rect.height, left: offset.left };

                    $('.streamcomplete-body').hide(); // Hide all open

                    output = data.outputelement;
                    output.show().data({'sc-results': results});

                    data.results = results;
                    data.s.onopen.call(T, results, outputbounds);

                    if (data.s.appendto === 'body') {
                        output.css(outputbounds);
                    }

                    output.empty();
                    for (var i = 0; results ? i < results.length : 0; i++) {
                        var desc = getAsObject(results[i]);

                        var res = data.renderResult(desc);
                        output.append(res);
                    }
                };

                /**
                 * The after render function. Seperate from the render function because the render function can be customised, whereas
                 *  everything in this function is more or less always required. Makes customising the output easier
                 */
                data.afterRender = function () {
                    var output = data.outputelement,
                        results = output.data('sc-results'),
                        funcname = 'click.streamcomplete-' + data.instanceid;
                    output.data('sc-results', results);
                    $('body').off(funcname).on(funcname, data.close);
                };

                /**
                 * Event after a user has made a selection
                 * @param {Event} e
                 */
                data.close = function (e) {
                    var selection = null;
                    var fromevent = false;

                    if (e) {
                        // This function was called as a result of an event
                        var target = $(e.target);
                        var sc = target.closest('.streamcomplete-result').data('streamcomplete');

                        fromevent = true;

                        if (target.closest(data.outputelement).length) {
                            // The user has clicked on one of the selections
                            selection = target.closest('.streamcomplete-result').data('sc-desc');
                            if (data.s.onselect.call(T, selection) === false) {
                                // The caller has prevented continuation
                                return false;
                            }
                            T[0].value = selection.value;
                            T.data('value', selection.id);
                            T.data('streamcomplete-item', selection);
                        } else if (sc && sc.instanceid === data.instanceid) {
                            e.preventDefault();
                            return false;
                        }
                        $('body').off('click.streamcomplete-' + data.instanceid);
                    }

                    data.s.onclose.call(T, {
                        selection: selection,
                        results: data.outputelement.hide().data('sc-results') || [],
                        fromevent: fromevent,
                        originalevent: e ? e.originalEvent || false : false,
                        fromselectevent: e ? $(e.target).hasClass('streamcomplete-result') : false
                    });
                };

                T.keydown(function (e) {
                    // If there is need to return false, then the keyboard event listener has to be onkeydown.
                    if (inObj(keycodes, e.which)) {
                        // The user is navigating using the keyboard
                        var ans = keyboardAction(e.which);
                        if (ans === false) {
                            // The keyboard action returned false, so prevent the default action
                            e.preventDefault();
                            e.stopPropagation();
                            cancelkeypress = true;
                            return false;
                        }
                    }
                });

                /**
                 * A callback if the source parameter is a function
                 * @param {array} results An array of results
                 */
                data.returnSource = function (results) {
                    if (data.s.onsearch.call(T, results) === false) {
                        return false;
                    }
                    data.render(results);
                    data.afterRender();
                };

                T.focus(function () {
                    var curdata = (T.data('streamcomplete') || {}).results;
                    if (curdata && curdata.length) {
                        data.render(curdata);
                        data.afterRender();
                    }
                });

                T.keyup(function (e) {
                    if (cancelkeypress) {
                        // The keydown event listener says that the keyup event should not be registered
                        cancelkeypress = false;
                        return false;
                    }

                    if (e.which === keycodes.SHIFT) {
                        // Don't trigger a search on shift key press. Causes issues when using reverse tab
                        return false;
                    }

                    if ((data.results || []).length && (e.which === keycodes.LEFT || e.which === keycodes.RIGHT || e.which === keycodes.ENTER)) {
                        // Don't perform a search just because the user is navigating (unless there's no data)
                        if (e.which === keycodes.ENTER) {
                            T.focus();
                        }
                        return;
                    }
                    data.searchterm = this.value;
                    var payload = {
                        term: data.searchterm
                    };
                    data.keyboard.selectpos = -1;
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
                            data.outputelement.data({'sc-results': []});
                            data.results = [];
                            switch (Object.prototype.toString.call(data.s.src)) {
                                case '[object String]':
                                    // Assume that the given string is a URL to resolve
                                    if (data.s.usestandardsyntax) {
                                        getDataAjaxStandard(data.s.src, payload);
                                    } else {
                                        getDataAjax(data.s.src, payload);
                                    }
                                    break;
                                case '[object Function]':
                                    // Call the source function
                                    data.s.src(data.searchterm, data.returnSource);
                                    break;
                                case '[object Array]':
                                    var datasrc = data.s.src,
                                        re = new RegExp(data.searchterm.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), 'i'),
                                        results = [], i, line;
                                    for (i = 0; i < datasrc.length; i++) {
                                        line = getAsObject(datasrc[i]);
                                        if (line.value.match(re)) {
                                            results[results.length] = line;
                                        }
                                    }
                                    if (data.s.onsearch.call(T, results) === false) {
                                        return false;
                                    }
                                    data.render(results);
                                    data.afterRender();
                                    break;
                            }
                        }, +data.s.delay);
                    } else {
                        // No need to show the results because they are now wrong
                        clear = true;
                        data.close();
                    }
                    if (!this.value.length && data.s.clearonemptysearch && data.s.onemptysearchclear.call(T) !== false) {
                        data.results = [];
                    }
                    T.data('streamcomplete', data);
                });

                /**
                 * Conform a line in an array so that it is an object with at least the propeties id, value and label
                 * @param {mixed} line The line
                 * @returns {object} An object with at least the properties id, value and label
                 */
                function getAsObject(line) {
                    switch (Object.prototype.toString.call(line)) {
                        case '[object String]':
                            // Make the string into an object
                            line = {id: i, value: line};
                            break;
                    }
                    if (!line.label && line.value) {
                        line.label = line.value;
                    }
                    if (!line.value && line.label) {
                        line.value = line.label;
                    }
                    return line;
                }

                function getClasses() {
                    var classnames = [
                        'streamcomplete-body',
                        'streamcomplete-body-iid-' + data.instanceid
                    ];
                    classnames = classnames.concat(data.s.classnames);
                    return classnames;
                }

                /**
                 *
                 * @returns {undefined}
                 */
                function draw() {
                    var classnames = getClasses();
                    var el = $('.' + classnames.join('.'));

                    if (!el.length) {
                        // The element is yet to be created
                        $(data.s.appendto).append($('<div>', {
                            class: classnames.join(' ')
                        }));

                        data.outputelement = $('.' + classnames.join('.'));
                    }
                }

                /**
                 * Get data for the autocomplete via AJAX
                 * @param {string} url The url to get the AJAX results from
                 * @param {object(plain)} payload The payload to pass to as post data
                 */
                var getDataAjax = function (url, payload) {
                    if (ajax) {
                        // There is a running ajax request
                        ajax.abort();
                    }
                    ajax = $.ajax({
                        url: url,
                        type: data.s.requestmethod,
                        dataType: 'json',
                        beforeSend: function (e) {
                            data.s.onbeforeajaxsearch.call(T, e);
                        },
                        data: {payload: JSON.stringify(payload)}
                    }).always(function () {
                        ajax = null;
                    }).done(function (e) {
                        if (e.result === 'OK') {
                            if (clear) {
                                // A clear was called during the request
                                clear = false;
                                return;
                            }
                            if (data.s.preprocessresults) {
                                e.data = data.s.preprocessresults(e.data);
                            }
                            if (data.s.onresponse.call(T, e) === false) {
                                return false;
                            };
                            searchinterval = false;
                            if (data.s.onsearch.call(T, e.data) === false) {
                                return false;
                            }
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
                 * Get data for the autocomplete via AJAX using standard syntax
                 * @param {string} url The url to get the AJAX results from
                 * @param {object(plain)} payload The payload to pass to as post data
                 */
                var getDataAjaxStandard = function (url, payload) {
                    if (ajax) {
                        // There is a running ajax request
                        ajax.abort();
                    }
                    ajax = $.ajax({
                        url: url,
                        type: data.s.requestmethod,
                        dataType: 'json',
                        beforeSend: function (e) {
                            data.s.onbeforeajaxsearch.call(T, e);
                        },
                        data: payload
                    }).always(function () {
                        ajax = null;
                    }).done(function (e) {
                        if (e && e.data) {
                            if (clear) {
                                // A clear was called during the request
                                clear = false;
                                return;
                            }
                            if (data.s.preprocessresults) {
                                e.data = data.s.preprocessresults(e.data);
                            }
                            if (data.s.onresponse.call(T, e) === false) {
                                return false;
                            };
                            searchinterval = false;
                            if (data.s.onsearch.call(T, e.data) === false) {
                                return false;
                            }
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

                /**
                 * Process keyboard navigation
                 * @param {int} which The id of the key that was pressed
                 * @returns {Boolean} <b>False</b> if the navigation require
                 */
                var keyboardAction = function (which) {
                    var body = data.outputelement;
                    var resultlist = $('.streamcomplete-result', body),
                        len = resultlist.length;

                    switch (which) {
                        case keycodes.UP:
                            data.keyboard.selectpos = (data.keyboard.selectpos - 1 < 0 ? len : data.keyboard.selectpos) - 1;
                            $('.streamcomplete-result-hover', body).removeClass('streamcomplete-result-hover');
                            $(resultlist[data.keyboard.selectpos]).addClass('streamcomplete-result-hover');
                            return false;
                        case keycodes.DOWN:
                            data.keyboard.selectpos = data.keyboard.selectpos + 1 === len ? 0 : data.keyboard.selectpos + 1;
                            $('.streamcomplete-result-hover', body).removeClass('streamcomplete-result-hover');
                            $(resultlist[data.keyboard.selectpos]).addClass('streamcomplete-result-hover');
                            return false;
                        case keycodes.SPACE:
                        case keycodes.ENTER:
                        case keycodes.TAB:
                            var res = $('.streamcomplete-result-hover', body);
                            if (res.length) {
                                $('.streamcomplete-result-hover', body).removeClass('streamcomplete-result-hover');
                                data.close({target: res[0]});
                                return false;
                            }
                            return true;
                        case keycodes.ESC:
                            var res = $('.streamcomplete-result-hover', body);
                            if (res.length) {
                                data.keyboard.selectpos = -1;
                                $('.streamcomplete-result-hover', body).removeClass('streamcomplete-result-hover');
                                return false;
                            }
                            return true;
                        case keycodes.SHIFT:
                            return false;
                    }
                };

                // Call user events longhand: this will allow a user to update opts successfully
                var funcs = ['focusin', 'focusout'];
                for (var i = 0; i < funcs.length; i++) {
                    var funcname = funcs[i]; // E.g. focusin, change
                    T[funcname](function (e) {
                        var scdata = $(this).data('streamcomplete');
                        if (Object.prototype.toString.call(scdata.s['on' + e.type]) === '[object Function]') {
                            scdata.s['on' + e.type].call(this, e);
                        }
                    });
                }
                T.data('streamcomplete', data);
                draw();
                data.s.oninit.call(T);
                return T;
            },
            /**
             * Set the value for this autocomplete
             * @param {object} data An object with at least two properties, value (the human readable value for the input) and id
             *  (the system value). Any more properties will be added into data attributes of the given key
             * @returns {jQuery}
             */
            setValue: function (data) {
                // Test to see whether the plugin has been initialised here first
                var T = this;
                if (T.length > 1) {
                    T.each(function () {
                        $(this).streamComplete('clearValue');
                    });
                    return T;
                }
                var scdata = T.data('streamcomplete');
                if (!scdata) {
                    throw ex('InstanceError', "A call to 'setValue' on an uninitialised object");
                }
                T[0].value = data.value;
                T.data('value', data.id);
                T.data('streamcomplete-item', data);
                // Add in data attributes for all of the other ones
                for (var x in data) {
                    if (x !== 'id' && x !== 'value') {
                        T.data(x, data[x]);
                    }
                }
                return T.change();
            },
            /**
             * Clear the value for this autocomplete
             * @param {array} properties An array of properties to remove
             * @returns {jQuery}
             */
            clearValue: function (properties) {
                var T = this;
                if (T.length > 1) {
                    T.each(function () {
                        $(this).streamComplete('clearValue');
                    });
                    return T;
                }
                // Test to see whether the plugin has been initialised here first
                var scdata = T.data('streamcomplete'),
                    i;
                if (!scdata) {
                    throw ex('InstanceError', "A call to 'setValue' on an uninitialised object");
                }
                T[0].value = '';
                T.data('value', '');
                for (i = 0; i < (properties || []).length; i++) {
                    this.data(properties[i], '');
                }
                return this.change();
            },
            /**
             * Update options for this autocomplete
             * @param {object} opts An object with properties that could have been supplied at plugin initialisation
             * @returns {jQuery}
             */
            updateOpts: function (opts) {
                var T = this;
                if (T.length > 1) {
                    T.each(function () {
                        $(this).streamComplete('updateOpts', opts);
                    });
                    return T;
                }
                var scdata = this.data('streamcomplete');
                if (!scdata) {
                    throw ex('InstanceError', "A call to 'setValue' on an uninitialised object");
                }
                scdata.s = $.extend(scdata.s, opts);
                T.data('streamcomplete', scdata);
                return this;
            }
        };

    /**
     * StreamConfirm exception handler
     * @param {string} exceptiontype The name of the exception to replace xxx in the string "Uncaught StreamComplete::xxx - message"
     * @param {string} message The exception message
     * @returns {StreamComplete::Exception}
     */
    function ex(exceptiontype, message) {
        return {
            name: 'StreamComplete::' + exceptiontype,
            level: "Cannot continue",
            message: message,
            htmlMessage: message,
            toString: function() {
                return ['StreamComplete::', exceptiontype, ' - ', message].join('');
            }
        };
    };

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

})(jQuery, 0);
