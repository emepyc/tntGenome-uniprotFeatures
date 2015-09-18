(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
if (typeof tnt === "undefined") {
    module.exports = tnt = {};
}
tnt.board = require("./index.js");
tnt.utils = require("tnt.utils");
tnt.tooltip = require("tnt.tooltip");

},{"./index.js":2,"tnt.tooltip":35,"tnt.utils":37}],2:[function(require,module,exports){
// if (typeof tnt === "undefined") {
//     module.exports = tnt = {}
// }
module.exports = require("./src/index.js");


},{"./src/index.js":44}],3:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],4:[function(require,module,exports){
module.exports = require("./src/api.js");

},{"./src/api.js":5}],5:[function(require,module,exports){
var api = function (who) {

    var _methods = function () {
	var m = [];

	m.add_batch = function (obj) {
	    m.unshift(obj);
	};

	m.update = function (method, value) {
	    for (var i=0; i<m.length; i++) {
		for (var p in m[i]) {
		    if (p === method) {
			m[i][p] = value;
			return true;
		    }
		}
	    }
	    return false;
	};

	m.add = function (method, value) {
	    if (m.update (method, value) ) {
	    } else {
		var reg = {};
		reg[method] = value;
		m.add_batch (reg);
	    }
	};

	m.get = function (method) {
	    for (var i=0; i<m.length; i++) {
		for (var p in m[i]) {
		    if (p === method) {
			return m[i][p];
		    }
		}
	    }
	};

	return m;
    };

    var methods    = _methods();
    var api = function () {};

    api.check = function (method, check, msg) {
	if (method instanceof Array) {
	    for (var i=0; i<method.length; i++) {
		api.check(method[i], check, msg);
	    }
	    return;
	}

	if (typeof (method) === 'function') {
	    method.check(check, msg);
	} else {
	    who[method].check(check, msg);
	}
	return api;
    };

    api.transform = function (method, cbak) {
	if (method instanceof Array) {
	    for (var i=0; i<method.length; i++) {
		api.transform (method[i], cbak);
	    }
	    return;
	}

	if (typeof (method) === 'function') {
	    method.transform (cbak);
	} else {
	    who[method].transform(cbak);
	}
	return api;
    };

    var attach_method = function (method, opts) {
	var checks = [];
	var transforms = [];

	var getter = opts.on_getter || function () {
	    return methods.get(method);
	};

	var setter = opts.on_setter || function (x) {
	    for (var i=0; i<transforms.length; i++) {
		x = transforms[i](x);
	    }

	    for (var j=0; j<checks.length; j++) {
		if (!checks[j].check(x)) {
		    var msg = checks[j].msg || 
			("Value " + x + " doesn't seem to be valid for this method");
		    throw (msg);
		}
	    }
	    methods.add(method, x);
	};

	var new_method = function (new_val) {
	    if (!arguments.length) {
		return getter();
	    }
	    setter(new_val);
	    return who; // Return this?
	};
	new_method.check = function (cbak, msg) {
	    if (!arguments.length) {
		return checks;
	    }
	    checks.push ({check : cbak,
			  msg   : msg});
	    return this;
	};
	new_method.transform = function (cbak) {
	    if (!arguments.length) {
		return transforms;
	    }
	    transforms.push(cbak);
	    return this;
	};

	who[method] = new_method;
    };

    var getset = function (param, opts) {
	if (typeof (param) === 'object') {
	    methods.add_batch (param);
	    for (var p in param) {
		attach_method (p, opts);
	    }
	} else {
	    methods.add (param, opts.default_value);
	    attach_method (param, opts);
	}
    };

    api.getset = function (param, def) {
	getset(param, {default_value : def});

	return api;
    };

    api.get = function (param, def) {
	var on_setter = function () {
	    throw ("Method defined only as a getter (you are trying to use it as a setter");
	};

	getset(param, {default_value : def,
		       on_setter : on_setter}
	      );

	return api;
    };

    api.set = function (param, def) {
	var on_getter = function () {
	    throw ("Method defined only as a setter (you are trying to use it as a getter");
	};

	getset(param, {default_value : def,
		       on_getter : on_getter}
	      );

	return api;
    };

    api.method = function (name, cbak) {
	if (typeof (name) === 'object') {
	    for (var p in name) {
		who[p] = name[p];
	    }
	} else {
	    who[name] = cbak;
	}
	return api;
    };

    return api;
    
};

module.exports = exports = api;
},{}],6:[function(require,module,exports){
// if (typeof tnt === "undefined") {
//     module.exports = tnt = {}
// }
// tnt.utils = require("tnt.utils");
// tnt.tooltip = require("tnt.tooltip");
// tnt.board = require("./src/index.js");

module.exports = require("./src/index");

},{"./src/index":16}],7:[function(require,module,exports){
module.exports=require(4)
},{"./src/api.js":8}],8:[function(require,module,exports){
module.exports=require(5)
},{}],9:[function(require,module,exports){
module.exports = require("./src/index.js");

},{"./src/index.js":10}],10:[function(require,module,exports){
// require('fs').readdirSync(__dirname + '/').forEach(function(file) {
//     if (file.match(/.+\.js/g) !== null && file !== __filename) {
// 	var name = file.replace('.js', '');
// 	module.exports[name] = require('./' + file);
//     }
// });

// Same as
var utils = require("./utils.js");
utils.reduce = require("./reduce.js");
module.exports = exports = utils;

},{"./reduce.js":11,"./utils.js":12}],11:[function(require,module,exports){
var reduce = function () {
    var smooth = 5;
    var value = 'val';
    var redundant = function (a, b) {
	if (a < b) {
	    return ((b-a) <= (b * 0.2));
	}
	return ((a-b) <= (a * 0.2));
    };
    var perform_reduce = function (arr) {return arr;};

    var reduce = function (arr) {
	if (!arr.length) {
	    return arr;
	}
	var smoothed = perform_smooth(arr);
	var reduced  = perform_reduce(smoothed);
	return reduced;
    };

    var median = function (v, arr) {
	arr.sort(function (a, b) {
	    return a[value] - b[value];
	});
	if (arr.length % 2) {
	    v[value] = arr[~~(arr.length / 2)][value];	    
	} else {
	    var n = ~~(arr.length / 2) - 1;
	    v[value] = (arr[n][value] + arr[n+1][value]) / 2;
	}

	return v;
    };

    var clone = function (source) {
	var target = {};
	for (var prop in source) {
	    if (source.hasOwnProperty(prop)) {
		target[prop] = source[prop];
	    }
	}
	return target;
    };

    var perform_smooth = function (arr) {
	if (smooth === 0) { // no smooth
	    return arr;
	}
	var smooth_arr = [];
	for (var i=0; i<arr.length; i++) {
	    var low = (i < smooth) ? 0 : (i - smooth);
	    var high = (i > (arr.length - smooth)) ? arr.length : (i + smooth);
	    smooth_arr[i] = median(clone(arr[i]), arr.slice(low,high+1));
	}
	return smooth_arr;
    };

    reduce.reducer = function (cbak) {
	if (!arguments.length) {
	    return perform_reduce;
	}
	perform_reduce = cbak;
	return reduce;
    };

    reduce.redundant = function (cbak) {
	if (!arguments.length) {
	    return redundant;
	}
	redundant = cbak;
	return reduce;
    };

    reduce.value = function (val) {
	if (!arguments.length) {
	    return value;
	}
	value = val;
	return reduce;
    };

    reduce.smooth = function (val) {
	if (!arguments.length) {
	    return smooth;
	}
	smooth = val;
	return reduce;
    };

    return reduce;
};

var block = function () {
    var red = reduce()
	.value('start');

    var value2 = 'end';

    var join = function (obj1, obj2) {
        return {
            'object' : {
                'start' : obj1.object[red.value()],
                'end'   : obj2[value2]
            },
            'value'  : obj2[value2]
        };
    };

    // var join = function (obj1, obj2) { return obj1 };

    red.reducer( function (arr) {
	var value = red.value();
	var redundant = red.redundant();
	var reduced_arr = [];
	var curr = {
	    'object' : arr[0],
	    'value'  : arr[0][value2]
	};
	for (var i=1; i<arr.length; i++) {
	    if (redundant (arr[i][value], curr.value)) {
		curr = join(curr, arr[i]);
		continue;
	    }
	    reduced_arr.push (curr.object);
	    curr.object = arr[i];
	    curr.value = arr[i].end;
	}
	reduced_arr.push(curr.object);

	// reduced_arr.push(arr[arr.length-1]);
	return reduced_arr;
    });

    reduce.join = function (cbak) {
	if (!arguments.length) {
	    return join;
	}
	join = cbak;
	return red;
    };

    reduce.value2 = function (field) {
	if (!arguments.length) {
	    return value2;
	}
	value2 = field;
	return red;
    };

    return red;
};

var line = function () {
    var red = reduce();

    red.reducer ( function (arr) {
	var redundant = red.redundant();
	var value = red.value();
	var reduced_arr = [];
	var curr = arr[0];
	for (var i=1; i<arr.length-1; i++) {
	    if (redundant (arr[i][value], curr[value])) {
		continue;
	    }
	    reduced_arr.push (curr);
	    curr = arr[i];
	}
	reduced_arr.push(curr);
	reduced_arr.push(arr[arr.length-1]);
	return reduced_arr;
    });

    return red;

};

module.exports = reduce;
module.exports.line = line;
module.exports.block = block;


},{}],12:[function(require,module,exports){

module.exports = {
    iterator : function(init_val) {
	var i = init_val || 0;
	var iter = function () {
	    return i++;
	};
	return iter;
    },

    script_path : function (script_name) { // script_name is the filename
	var script_scaped = script_name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
	var script_re = new RegExp(script_scaped + '$');
	var script_re_sub = new RegExp('(.*)' + script_scaped + '$');

	// TODO: This requires phantom.js or a similar headless webkit to work (document)
	var scripts = document.getElementsByTagName('script');
	var path = "";  // Default to current path
	if(scripts !== undefined) {
            for(var i in scripts) {
		if(scripts[i].src && scripts[i].src.match(script_re)) {
                    return scripts[i].src.replace(script_re_sub, '$1');
		}
            }
	}
	return path;
    },

    defer_cancel : function (cbak, time) {
	var tick;

	var defer_cancel = function () {
	    clearTimeout(tick);
	    tick = setTimeout(cbak, time);
	};

	return defer_cancel;
    }
};

},{}],13:[function(require,module,exports){
var apijs = require ("tnt.api");
var deferCancel = require ("tnt.utils").defer_cancel;

var board = function() {
    "use strict";

    //// Private vars
    var svg;
    var div_id;
    var tracks = [];
    var min_width = 50;
    var height    = 0;    // This is the global height including all the tracks
    var width     = 920;
    var height_offset = 20;
    var loc = {
	species  : undefined,
	chr      : undefined,
        from     : 0,
        to       : 500
    };

    // TODO: We have now background color in the tracks. Can this be removed?
    // It looks like it is used in the too-wide pane etc, but it may not be needed anymore
    var bgColor   = d3.rgb('#F8FBEF'); //#F8FBEF
    var pane; // Draggable pane
    var svg_g;
    var xScale;
    var zoomEventHandler = d3.behavior.zoom();
    var limits = {
        left : 0,
        right : 1000,
        zoom_out : 1000,
        zoom_in  : 100
    };
    var cap_width = 3;
    var dur = 500;
    var drag_allowed = true;

    var exports = {
        ease          : d3.ease("cubic-in-out"),
        extend_canvas : {
            left : 0,
            right : 0
        },
        show_frame : true
        // limits        : function () {throw "The limits method should be defined"}
    };

    // The returned closure / object
    var track_vis = function(div) {
    	div_id = d3.select(div).attr("id");

    	// The original div is classed with the tnt class
    	d3.select(div)
    	    .classed("tnt", true);

    	// TODO: Move the styling to the scss?
    	var browserDiv = d3.select(div)
    	    .append("div")
    	    .attr("id", "tnt_" + div_id)
    	    .style("position", "relative")
    	    .classed("tnt_framed", exports.show_frame ? true : false)
    	    .style("width", (width + cap_width*2 + exports.extend_canvas.right + exports.extend_canvas.left) + "px");

    	var groupDiv = browserDiv
    	    .append("div")
    	    .attr("class", "tnt_groupDiv");

    	// The SVG
    	svg = groupDiv
    	    .append("svg")
    	    .attr("class", "tnt_svg")
    	    .attr("width", width)
    	    .attr("height", height)
    	    .attr("pointer-events", "all");

    	svg_g = svg
    	    .append("g")
                .attr("transform", "translate(0,20)")
                .append("g")
    	    .attr("class", "tnt_g");

    	// caps
    	svg_g
    	    .append("rect")
    	    .attr("id", "tnt_" + div_id + "_5pcap")
    	    .attr("x", 0)
    	    .attr("y", 0)
    	    .attr("width", 0)
    	    .attr("height", height)
    	    .attr("fill", "red");
    	svg_g
    	    .append("rect")
    	    .attr("id", "tnt_" + div_id + "_3pcap")
    	    .attr("x", width-cap_width)
    	    .attr("y", 0)
    	    .attr("width", 0)
    	    .attr("height", height)
    	    .attr("fill", "red");

    	// The Zooming/Panning Pane
    	pane = svg_g
    	    .append("rect")
    	    .attr("class", "tnt_pane")
    	    .attr("id", "tnt_" + div_id + "_pane")
    	    .attr("width", width)
    	    .attr("height", height)
    	    .style("fill", bgColor);

    	// ** TODO: Wouldn't be better to have these messages by track?
    	// var tooWide_text = svg_g
    	//     .append("text")
    	//     .attr("class", "tnt_wideOK_text")
    	//     .attr("id", "tnt_" + div_id + "_tooWide")
    	//     .attr("fill", bgColor)
    	//     .text("Region too wide");

    	// TODO: I don't know if this is the best way (and portable) way
    	// of centering the text in the text area
    	// var bb = tooWide_text[0][0].getBBox();
    	// tooWide_text
    	//     .attr("x", ~~(width/2 - bb.width/2))
    	//     .attr("y", ~~(height/2 - bb.height/2));
    };

    // API
    var api = apijs (track_vis)
    	.getset (exports)
    	.getset (limits)
    	.getset (loc);

    api.transform (track_vis.extend_canvas, function (val) {
    	var prev_val = track_vis.extend_canvas();
    	val.left = val.left || prev_val.left;
    	val.right = val.right || prev_val.right;
    	return val;
    });

    // track_vis always starts on loc.from & loc.to
    api.method ('start', function () {

        // Reset the tracks
        for (var i=0; i<tracks.length; i++) {
            if (tracks[i].g) {
                //    tracks[i].display().reset.call(tracks[i]);
                tracks[i].g.remove();
            }
            _init_track(tracks[i]);
        }
        _place_tracks();

        // The continuation callback
        var cont = function (resp) {
            limits.right = resp;

            // zoomEventHandler.xExtent([limits.left, limits.right]);
            if ((loc.to - loc.from) < limits.zoom_in) {
                if ((loc.from + limits.zoom_in) > limits.right) {
                    loc.to = limits.right;
                } else {
                    loc.to = loc.from + limits.zoom_in;
                }
            }
            plot();

            for (var i=0; i<tracks.length; i++) {
                _update_track(tracks[i], loc);
            }
        };

        // If limits.right is a function, we have to call it asynchronously and
        // then starting the plot once we have set the right limit (plot)
        // If not, we assume that it is an objet with new (maybe partially defined)
        // definitions of the limits and we can plot directly
        // TODO: Right now, only right can be called as an async function which is weak
        if (typeof (limits.right) === 'function') {
            limits.right(cont);
        } else {
            cont(limits.right);
        }
    });

    api.method ('update', function () {
    	for (var i=0; i<tracks.length; i++) {
    	    _update_track (tracks[i]);
    	}
    });

    var _update_track = function (track, where) {
    	if (track.data()) {
    	    var track_data = track.data();
    	    var data_updater = track_data.update();
    	    //var data_updater = track.data().update();
    	    data_updater.call(track_data, {
    		'loc' : where,
    		'on_success' : function () {
    		    track.display().update.call(track, xScale, where);
    		}
    	    });
    	}
    };

    var plot = function() {
    	xScale = d3.scale.linear()
    	    .domain([loc.from, loc.to])
    	    .range([0, width]);

    	if (drag_allowed) {
    	    svg_g.call( zoomEventHandler
    		       .x(xScale)
    		       .scaleExtent([(loc.to-loc.from)/(limits.zoom_out-1), (loc.to-loc.from)/limits.zoom_in])
    		       .on("zoom", _move)
    		     );
    	}
    };

    // right/left/zoom pans or zooms the track. These methods are exposed to allow external buttons, etc to interact with the tracks. The argument is the amount of panning/zooming (ie. 1.2 means 20% panning) With left/right only positive numbers are allowed.
    api.method ('move_right', function (factor) {
    	if (factor > 0) {
    	    _manual_move(factor, 1);
    	}
    });

    api.method ('move_left', function (factor) {
    	if (factor > 0) {
    	    _manual_move(factor, -1);
    	}
    });

    api.method ('zoom', function (factor) {
        _manual_move(factor, 0);
    });

    api.method ('find_track_by_id', function (id) {
    	for (var i=0; i<tracks.length; i++) {
    	    if (tracks[i].id() === id) {
    		return tracks[i];
    	    }
    	}
    });

    api.method ('reorder', function (new_tracks) {
    	// TODO: This is defining a new height, but the global height is used to define the size of several
    	// parts. We should do this dynamically

        var found_indexes = [];
    	for (var j=0; j<new_tracks.length; j++) {
    	    var found = false;
    	    for (var i=0; i<tracks.length; i++) {
        		if (tracks[i].id() === new_tracks[j].id()) {
        		    found = true;
                    found_indexes[i] = true;
                    // tracks.splice(i,1);
        		    break;
        		}
    	    }
    	    if (!found) {
                _init_track(new_tracks[j]);
        		_update_track(new_tracks[j], {from : loc.from, to : loc.to});
    	    }
    	}

    	for (var x=0; x<tracks.length; x++) {
            if (!found_indexes[x]) {
                tracks[x].g.remove();
            }
    	}

    	tracks = new_tracks;
    	_place_tracks();

    });

    api.method ('remove_track', function (track) {
        track.g.remove();
    });

    api.method ('add_track', function (track) {
    	if (track instanceof Array) {
    	    for (var i=0; i<track.length; i++) {
    		track_vis.add_track (track[i]);
    	    }
    	    return track_vis;
    	}
    	tracks.push(track);
    	return track_vis;
    });

    api.method('tracks', function (new_tracks) {
    	if (!arguments.length) {
    	    return tracks;
    	}
    	tracks = new_tracks;
    	return track_vis;
    });

    //
    api.method ('width', function (w) {
    	// TODO: Allow suffixes like "1000px"?
    	// TODO: Test wrong formats
    	if (!arguments.length) {
    	    return width;
    	}
    	// At least min-width
    	if (w < min_width) {
    	    w = min_width;
    	}

    	// We are resizing
    	if (div_id !== undefined) {
    	    d3.select("#tnt_" + div_id).select("svg").attr("width", w);
    	    // Resize the zooming/panning pane
    	    d3.select("#tnt_" + div_id).style("width", (parseInt(w) + cap_width*2) + "px");
    	    d3.select("#tnt_" + div_id + "_pane").attr("width", w);

    	    // Replot
    	    width = w;
    	    plot();
    	    for (var i=0; i<tracks.length; i++) {
        		tracks[i].g.select("rect").attr("width", w);
        		tracks[i].display().reset.call(tracks[i]);
        		tracks[i].display().update.call(tracks[i],xScale);
    	    }
    	} else {
    	    width = w;
    	}
        return track_vis;
    });

    api.method('allow_drag', function(b) {
	if (!arguments.length) {
	    return drag_allowed;
	}
	drag_allowed = b;
	if (drag_allowed) {
	    // When this method is called on the object before starting the simulation, we don't have defined xScale
	    if (xScale !== undefined) {
		svg_g.call( zoomEventHandler.x(xScale)
			   // .xExtent([0, limits.right])
			   .scaleExtent([(loc.to-loc.from)/(limits.zoom_out-1), (loc.to-loc.from)/limits.zoom_in])
			   .on("zoom", _move) );
	    }
	} else {
	    // We create a new dummy scale in x to avoid dragging the previous one
	    // TODO: There may be a cheaper way of doing this?
	    zoomEventHandler.x(d3.scale.linear()).on("zoom", null);
	}
	return track_vis;
    });

    var _place_tracks = function () {
        var h = 0;
        for (var i=0; i<tracks.length; i++) {
            var track = tracks[i];
            if (track.g.attr("transform")) {
                track.g
                    .transition()
                    .duration(dur)
                    .attr("transform", "translate(" + exports.extend_canvas.left + "," + h + ")");
            } else {
                track.g
                    .attr("transform", "translate(" + exports.extend_canvas.left + "," + h + ")");
            }

            h += track.height();
        }

        // svg
        svg.attr("height", h + height_offset);

        // div
        d3.select("#tnt_" + div_id)
            .style("height", (h + 10 + height_offset) + "px");

        // caps
        d3.select("#tnt_" + div_id + "_5pcap")
            .attr("height", h)
            // .move_to_front()
            .each(function (d) {
                move_to_front(this);
            });

        d3.select("#tnt_" + div_id + "_3pcap")
            .attr("height", h)
            //.move_to_front()
            .each (function (d) {
                move_to_front(this);
            });

        // pane
        pane
            .attr("height", h + height_offset);

        return track_vis;
    };

    var _init_track = function (track) {
        track.g = svg.select("g").select("g")
    	    .append("g")
    	    .attr("class", "tnt_track")
    	    .attr("height", track.height());

    	// Rect for the background color
    	track.g
    	    .append("rect")
    	    .attr("x", 0)
    	    .attr("y", 0)
    	    .attr("width", track_vis.width())
    	    .attr("height", track.height())
    	    .style("fill", track.background_color())
    	    .style("pointer-events", "none");

    	if (track.display()) {
    	    track.display().init.call(track, width);
    	}

    	return track_vis;
    };

    var _manual_move = function (factor, direction) {
        var oldDomain = xScale.domain();

    	var span = oldDomain[1] - oldDomain[0];
    	var offset = (span * factor) - span;

    	var newDomain;
    	switch (direction) {
            case -1 :
            newDomain = [(~~oldDomain[0] - offset), ~~(oldDomain[1] - offset)];
    	    break;
        	case 1 :
        	    newDomain = [(~~oldDomain[0] + offset), ~~(oldDomain[1] - offset)];
        	    break;
        	case 0 :
        	    newDomain = [oldDomain[0] - ~~(offset/2), oldDomain[1] + (~~offset/2)];
    	}

    	var interpolator = d3.interpolateNumber(oldDomain[0], newDomain[0]);
    	var ease = exports.ease;

    	var x = 0;
    	d3.timer(function() {
    	    var curr_start = interpolator(ease(x));
    	    var curr_end;
    	    switch (direction) {
        	    case -1 :
        		curr_end = curr_start + span;
        		break;
        	    case 1 :
        		curr_end = curr_start + span;
        		break;
        	    case 0 :
        		curr_end = oldDomain[1] + oldDomain[0] - curr_start;
        		break;
    	    }

    	    var currDomain = [curr_start, curr_end];
    	    xScale.domain(currDomain);
    	    _move(xScale);
    	    x+=0.02;
    	    return x>1;
    	});
    };


    var _move_cbak = function () {
        var currDomain = xScale.domain();
    	track_vis.from(~~currDomain[0]);
    	track_vis.to(~~currDomain[1]);

    	for (var i = 0; i < tracks.length; i++) {
    	    var track = tracks[i];
    	    _update_track(track, loc);
    	}
    };
    // The deferred_cbak is deferred at least this amount of time or re-scheduled if deferred is called before
    var _deferred = deferCancel(_move_cbak, 300);

    // api.method('update', function () {
    // 	_move();
    // });

    var _move = function (new_xScale) {
    	if (new_xScale !== undefined && drag_allowed) {
    	    zoomEventHandler.x(new_xScale);
    	}

    	// Show the red bars at the limits
    	var domain = xScale.domain();
    	if (domain[0] <= 5) {
    	    d3.select("#tnt_" + div_id + "_5pcap")
    		.attr("width", cap_width)
    		.transition()
    		.duration(200)
    		.attr("width", 0);
    	}

    	if (domain[1] >= (limits.right)-5) {
    	    d3.select("#tnt_" + div_id + "_3pcap")
    		.attr("width", cap_width)
    		.transition()
    		.duration(200)
    		.attr("width", 0);
    	}


    	// Avoid moving past the limits
    	if (domain[0] < limits.left) {
    	    zoomEventHandler.translate([zoomEventHandler.translate()[0] - xScale(limits.left) + xScale.range()[0], zoomEventHandler.translate()[1]]);
    	} else if (domain[1] > limits.right) {
    	    zoomEventHandler.translate([zoomEventHandler.translate()[0] - xScale(limits.right) + xScale.range()[1], zoomEventHandler.translate()[1]]);
    	}

    	_deferred();

    	for (var i = 0; i < tracks.length; i++) {
    	    var track = tracks[i];
    	    track.display().move.call(track,xScale);
    	}
    };

    // api.method({
    // 	allow_drag : api_allow_drag,
    // 	width      : api_width,
    // 	add_track  : api_add_track,
    // 	reorder    : api_reorder,
    // 	zoom       : api_zoom,
    // 	left       : api_left,
    // 	right      : api_right,
    // 	start      : api_start
    // });

    // Auxiliar functions
    function move_to_front (elem) {
        elem.parentNode.appendChild(elem);
    }

    return track_vis;
};

module.exports = exports = board;

},{"tnt.api":7,"tnt.utils":9}],14:[function(require,module,exports){
var apijs = require ("tnt.api");
// var ensemblRestAPI = require("tnt.ensembl");

// var board = {};
// board.track = {};

var data = function() {
    "use strict";
    var _ = function () {};

    // Getters / Setters
    apijs (_)
    // label is not used at the moment
	.getset ('label', "")
	.getset ('elements', [])
	.getset ('update', function () {});

    return _;
};

// The retrievers. They need to access 'elements'
data.retriever = {};

data.retriever.sync = function() {
    var update_track = function(obj) {
	// "this" is set to the data obj
        this.elements(update_track.retriever()(obj.loc));
        obj.on_success();
    };

    apijs (update_track)
	   .getset ('retriever', function () {});

    return update_track;
};

data.retriever.async = function () {
    var url = '';

    // "this" is set to the data obj
    var data_obj = this;
    var update_track = function (obj) {
    	d3.json(url, function (err, resp) {
    	    data_obj.elements(resp);
    	    obj.on_success();
    	});
    };

    apijs (update_track)
	.getset ('url', '');

    return update_track;
};


// A predefined track displaying no external data
// it is used for location and axis tracks for example
data.empty = function () {
    var track = data();
    var updater = data.retriever.sync();
    track.update(updater);

    return track;
};

module.exports = exports = data;

},{"tnt.api":7}],15:[function(require,module,exports){
var apijs = require ("tnt.api");
var layout = require("./layout.js");

// FEATURE VIS
// var board = {};
// board.track = {};
var tnt_feature = function () {
    var dispatch = d3.dispatch ("click", "dblclick", "mouseover", "mouseout");

    ////// Vars exposed in the API
    var exports = {
        create   : function () {throw "create_elem is not defined in the base feature object";},
        mover    : function () {throw "move_elem is not defined in the base feature object";},
        updater  : function () {},
        guider   : function () {},
        //layout   : function () {},
        index    : undefined,
        layout   : layout.identity(),
        foreground_color : '#000'
    };


    // The returned object
    var feature = {};

    var reset = function () {
    	var track = this;
    	track.g.selectAll(".tnt_elem").remove();
        track.g.selectAll(".tnt_guider").remove();
    };

    var init = function (width) {
        var track = this;

        track.g
            .append ("text")
            .attr ("x", 5)
            .attr ("y", 12)
            .attr ("font-size", 11)
            .attr ("fill", "grey")
            .text (track.label());

        exports.guider.call(track, width);
    };

    var plot = function (new_elems, track, xScale) {
        new_elems.on("click", dispatch.click);
        new_elems.on("mouseover", dispatch.mouseover);
        new_elems.on("dblclick", dispatch.dblclick);
        new_elems.on("mouseout", dispatch.mouseout);
        // new_elem is a g element where the feature is inserted
        exports.create.call(track, new_elems, xScale);
    };

    var update = function (xScale, where, field) {
        var track = this;
        var svg_g = track.g;
        // var layout = exports.layout;
        // if (layout.height) {
        //     layout.height(track.height());
        // }

        var elements = track.data().elements();

        if (field !== undefined) {
            elements = elements[field];
        }

        var data_elems = exports.layout.call(track, elements, xScale);

        var vis_sel;
        var vis_elems;
        if (field !== undefined) {
            vis_sel = svg_g.selectAll(".tnt_elem_" + field);
        } else {
            vis_sel = svg_g.selectAll(".tnt_elem");
        }

        if (exports.index) { // Indexing by field
            vis_elems = vis_sel
                .data(data_elems, function (d) {
                    if (d !== undefined) {
                        return exports.index(d);
                    }
                });
        } else { // Indexing by position in array
            vis_elems = vis_sel
                .data(data_elems);
        }

        exports.updater.call(track, vis_elems, xScale);

    	var new_elem = vis_elems
    	    .enter();

    	new_elem
    	    .append("g")
    	    .attr("class", "tnt_elem")
    	    .classed("tnt_elem_" + field, field)
    	    .call(feature.plot, track, xScale);

    	vis_elems
    	    .exit()
    	    .remove();
    };

    var move = function (xScale, field) {
    	var track = this;
    	var svg_g = track.g;
    	var elems;
    	// TODO: Is selecting the elements to move too slow?
    	// It would be nice to profile
    	if (field !== undefined) {
    	    elems = svg_g.selectAll(".tnt_elem_" + field);
    	} else {
    	    elems = svg_g.selectAll(".tnt_elem");
    	}

    	exports.mover.call(this, elems, xScale);
    };

    var mtf = function (elem) {
        elem.parentNode.appendChild(elem);
    };

    var move_to_front = function (field) {
        if (field !== undefined) {
            var track = this;
            var svg_g = track.g;
            svg_g.selectAll(".tnt_elem_" + field)
                .each( function () {
                    mtf(this);
                });
        }
    };

    // API
    apijs (feature)
    	.getset (exports)
    	.method ({
    	    reset  : reset,
    	    plot   : plot,
    	    update : update,
    	    move   : move,
    	    init   : init,
    	    move_to_front : move_to_front
    	});

    return d3.rebind(feature, dispatch, "on");
};

tnt_feature.composite = function () {
    var displays = {};
    var display_order = [];

    var features = {};

    var reset = function () {
    	var track = this;
    	for (var i=0; i<displays.length; i++) {
    	    displays[i].reset.call(track);
    	}
    };

    var init = function (width) {
    	var track = this;
     	for (var display in displays) {
    	    if (displays.hasOwnProperty(display)) {
    		displays[display].init.call(track, width);
    	    }
    	}
    };

    var update = function (xScale) {
    	var track = this;
    	for (var i=0; i<display_order.length; i++) {
    	    displays[display_order[i]].update.call(track, xScale, undefined, display_order[i]);
    	    displays[display_order[i]].move_to_front.call(track, display_order[i]);
    	}
    	// for (var display in displays) {
    	//     if (displays.hasOwnProperty(display)) {
    	// 	displays[display].update.call(track, xScale, display);
    	//     }
    	// }
    };

    var move = function (xScale) {
    	var track = this;
    	for (var display in displays) {
    	    if (displays.hasOwnProperty(display)) {
    		displays[display].move.call(track, xScale, display);
    	    }
    	}
    };

    var add = function (key, display) {
    	displays[key] = display;
    	display_order.push(key);
    	return features;
    };

    // var on_click = function (cbak) {
    //     for (var display in displays) {
    //         if (displays.hasOwnProperty(display)) {
    //             displays[display].on("click",cbak);
    //         }
    //     }
    //     return features;
    // };

    var get_displays = function () {
    	var ds = [];
    	for (var i=0; i<display_order.length; i++) {
    	    ds.push(displays[display_order[i]]);
    	}
    	return ds;
    };

    // API
    apijs (features)
	.method ({
	    reset  : reset,
	    update : update,
	    move   : move,
	    init   : init,
	    add    : add,
	    displays : get_displays
	});

    return features;
};

tnt_feature.area = function () {
    var feature = tnt_feature.line();
    var line = tnt_feature.line();

    var area = d3.svg.area()
    	.interpolate(line.interpolate())
    	.tension(feature.tension());

    var data_points;

    var line_create = feature.create(); // We 'save' line creation
    feature.create (function (points, xScale) {
    	var track = this;

    	if (data_points !== undefined) {
    //	     return;
    	    track.g.select("path").remove();
    	}

    	line_create.call(track, points, xScale);

    	area
    	    .x(line.x())
    	    .y1(line.y())
    	    .y0(track.height());

    	data_points = points.data();
    	points.remove();

    	track.g
    	    .append("path")
    	    .attr("class", "tnt_area")
    	    .classed("tnt_elem", true)
    	    .datum(data_points)
    	    .attr("d", area)
    	    .attr("fill", d3.rgb(feature.foreground_color()).brighter());
    });

    var line_mover = feature.mover();
    feature.mover (function (path, xScale) {
    	var track = this;
    	line_mover.call(track, path, xScale);

    	area.x(line.x());
    	track.g
    	    .select(".tnt_area")
    	    .datum(data_points)
    	    .attr("d", area);
    });

    return feature;

};

tnt_feature.line = function () {
    var feature = tnt_feature();

    var x = function (d) {
        return d.pos;
    };
    var y = function (d) {
        return d.val;
    };
    var tension = 0.7;
    var yScale = d3.scale.linear();
    var line = d3.svg.line()
        .interpolate("basis");

    // line getter. TODO: Setter?
    feature.line = function () {
        return line;
    };

    feature.x = function (cbak) {
    	if (!arguments.length) {
    	    return x;
    	}
    	x = cbak;
    	return feature;
    };

    feature.y = function (cbak) {
    	if (!arguments.length) {
    	    return y;
    	}
    	y = cbak;
    	return feature;
    };

    feature.tension = function (t) {
    	if (!arguments.length) {
    	    return tension;
    	}
    	tension = t;
    	return feature;
    };

    var data_points;

    // For now, create is a one-off event
    // TODO: Make it work with partial paths, ie. creating and displaying only the path that is being displayed
    feature.create (function (points, xScale) {
	var track = this;

	if (data_points !== undefined) {
	    // return;
	    track.g.select("path").remove();
	}

	line
	    .tension(tension)
	    .x(function (d) {
            return xScale(x(d));
	    })
	    .y(function (d) {
            return track.height() - yScale(y(d));
	    });

	data_points = points.data();
	points.remove();

	yScale
	    .domain([0, 1])
	    // .domain([0, d3.max(data_points, function (d) {
	    // 	return y(d);
	    // })])
	    .range([0, track.height() - 2]);

	track.g
	    .append("path")
	    .attr("class", "tnt_elem")
	    .attr("d", line(data_points))
	    .style("stroke", feature.foreground_color())
	    .style("stroke-width", 4)
	    .style("fill", "none");

    });

    feature.mover (function (path, xScale) {
    	var track = this;

    	line.x(function (d) {
    	    return xScale(x(d))
    	});
    	track.g.select("path")
    	    .attr("d", line(data_points));
    });

    return feature;
};

tnt_feature.conservation = function () {
        // 'Inherit' from feature.area
        var feature = tnt_feature.area();

        var area_create = feature.create(); // We 'save' area creation
        feature.create  (function (points, xScale) {
    	var track = this;

    	area_create.call(track, d3.select(points[0][0]), xScale);
        });

    return feature;
};

tnt_feature.ensembl = function () {
    // 'Inherit' from board.track.feature
    var feature = tnt_feature();

    var foreground_color2 = "#7FFF00";
    var foreground_color3 = "#00BB00";

    feature.guider (function (width) {
	var track = this;
	var height_offset = ~~(track.height() - (track.height()  * 0.8)) / 2;

	track.g
	    .append("line")
	    .attr("class", "tnt_guider")
	    .attr("x1", 0)
	    .attr("x2", width)
	    .attr("y1", height_offset)
	    .attr("y2", height_offset)
	    .style("stroke", feature.foreground_color())
	    .style("stroke-width", 1);

	track.g
	    .append("line")
	    .attr("class", "tnt_guider")
	    .attr("x1", 0)
	    .attr("x2", width)
	    .attr("y1", track.height() - height_offset)
	    .attr("y2", track.height() - height_offset)
	    .style("stroke", feature.foreground_color())
	    .style("stroke-width", 1);

    });

    feature.create (function (new_elems, xScale) {
	var track = this;

	var height_offset = ~~(track.height() - (track.height()  * 0.8)) / 2;

	new_elems
	    .append("rect")
	    .attr("x", function (d) {
            return xScale (d.start);
	    })
	    .attr("y", height_offset)
// 	    .attr("rx", 3)
// 	    .attr("ry", 3)
	    .attr("width", function (d) {
            return (xScale(d.end) - xScale(d.start));
	    })
	    .attr("height", track.height() - ~~(height_offset * 2))
	    .attr("fill", track.background_color())
	    .transition()
	    .duration(500)
	    .attr("fill", function (d) {
    		if (d.type === 'high') {
    		    return d3.rgb(feature.foreground_color());
    		}
    		if (d.type === 'low') {
    		    return d3.rgb(feature.foreground_color2());
    		}
    		return d3.rgb(feature.foreground_color3());
	    });
    });

    feature.updater (function (blocks, xScale) {
	blocks
	    .select("rect")
	    .attr("width", function (d) {
            return (xScale(d.end) - xScale(d.start));
	    });
    });

    feature.mover (function (blocks, xScale) {
	blocks
	    .select("rect")
	    .attr("x", function (d) {
            return xScale(d.start);
	    })
	    .attr("width", function (d) {
            return (xScale(d.end) - xScale(d.start));
	    });
    });

    feature.foreground_color2 = function (col) {
    	if (!arguments.length) {
    	    return foreground_color2;
    	}
    	foreground_color2 = col;
    	return feature;
    };

    feature.foreground_color3 = function (col) {
    	if (!arguments.length) {
    	    return foreground_color3;
    	}
    	foreground_color3 = col;
    	return feature;
    };

    return feature;
};

tnt_feature.vline = function () {
    // 'Inherit' from feature
    var feature = tnt_feature();

    feature.create (function (new_elems, xScale) {
    	var track = this;
    	new_elems
    	    .append ("line")
    	    .attr("x1", function (d) {
                // TODO: Should use the index value?
                return xScale(feature.index()(d));
    	    })
    	    .attr("x2", function (d) {
                return xScale(feature.index()(d));
    	    })
    	    .attr("y1", 0)
    	    .attr("y2", track.height())
    	    .attr("stroke", feature.foreground_color())
    	    .attr("stroke-width", 1);
    });

    feature.mover (function (vlines, xScale) {
    	vlines
    	    .select("line")
    	    .attr("x1", function (d) {
                return xScale(feature.index()(d));
    	    })
    	    .attr("x2", function (d) {
                return xScale(feature.index()(d));
    	    });
    });

    return feature;

};

tnt_feature.pin = function () {
    // 'Inherit' from board.track.feature
    var feature = tnt_feature();

    var yScale = d3.scale.linear()
    	.domain([0,0])
    	.range([0,0]);

    var opts = {
        pos : d3.functor("pos"),
        val : d3.functor("val"),
        domain : [0,0]
    };

    var pin_ball_r = 5; // the radius of the circle in the pin

    apijs(feature)
        .getset(opts);


    feature.create (function (new_pins, xScale) {
    	var track = this;
    	yScale
    	    .domain(feature.domain())
    	    .range([pin_ball_r, track.height()-pin_ball_r-10]); // 10 for labelling

    	// pins are composed of lines, circles and labels
    	new_pins
    	    .append("line")
    	    .attr("x1", function (d, i) {
    	    	return xScale(d[opts.pos(d, i)]);
    	    })
    	    .attr("y1", function (d) {
                return track.height();
    	    })
    	    .attr("x2", function (d,i) {
    	    	return xScale(d[opts.pos(d, i)]);
    	    })
    	    .attr("y2", function (d, i) {
    	    	return track.height() - yScale(d[opts.val(d, i)]);
    	    })
    	    .attr("stroke", feature.foreground_color());

    	new_pins
    	    .append("circle")
    	    .attr("cx", function (d, i) {
                return xScale(d[opts.pos(d, i)]);
    	    })
    	    .attr("cy", function (d, i) {
                return track.height() - yScale(d[opts.val(d, i)]);
    	    })
    	    .attr("r", pin_ball_r)
    	    .attr("fill", feature.foreground_color());

        new_pins
            .append("text")
            .attr("font-size", "13")
            .attr("x", function (d, i) {
                return xScale(d[opts.pos(d, i)]);
            })
            .attr("y", function (d, i) {
                return 10;
            })
            .style("text-anchor", "middle")
            .text(function (d) {
                return d.label || "";
            });

    });

    feature.updater (function (pins, xScale){
        pins
            .select("text")
            .text(function (d) {
                return d.label || "";
            });
    });

    feature.mover(function (pins, xScale) {
	var track = this;
	pins
	    //.each(position_pin_line)
	    .select("line")
	    .attr("x1", function (d, i) {
            return xScale(d[opts.pos(d, i)]);
	    })
	    .attr("y1", function (d) {
    		return track.height();
	    })
	    .attr("x2", function (d,i) {
    		return xScale(d[opts.pos(d, i)]);
	    })
	    .attr("y2", function (d, i) {
    		return track.height() - yScale(d[opts.val(d, i)]);
	    });

	pins
	    .select("circle")
	    .attr("cx", function (d, i) {
            return xScale(d[opts.pos(d, i)]);
	    })
	    .attr("cy", function (d, i) {
            return track.height() - yScale(d[opts.val(d, i)]);
	    });

    pins
        .select("text")
        .attr("x", function (d, i) {
            return xScale(d[opts.pos(d, i)]);
        })
        .text(function (d) {
            return d.label || "";
        });

    });

    feature.guider (function (width) {
	var track = this;
	track.g
	    .append("line")
	    .attr("x1", 0)
	    .attr("x2", width)
	    .attr("y1", track.height())
	    .attr("y2", track.height())
	    .style("stroke", "black")
	    .style("stroke-with", "1px");
    });

    return feature;
};

tnt_feature.block = function () {
    // 'Inherit' from board.track.feature
    var feature = tnt_feature();

    apijs(feature)
    	.getset('from', function (d) {
    	    return d.start;
    	})
    	.getset('to', function (d) {
    	    return d.end;
    	});

    feature.create(function (new_elems, xScale) {
    	var track = this;
    	new_elems
    	    .append("rect")
    	    .attr("x", function (d, i) {
        		// TODO: start, end should be adjustable via the tracks API
        		return xScale(feature.from()(d, i));
    	    })
    	    .attr("y", 0)
    	    .attr("width", function (d, i) {
        		return (xScale(feature.to()(d, i)) - xScale(feature.from()(d, i)));
    	    })
    	    .attr("height", track.height())
    	    .attr("fill", track.background_color())
    	    .transition()
    	    .duration(500)
    	    .attr("fill", function (d) {
        		if (d.color === undefined) {
        		    return feature.foreground_color();
        		} else {
        		    return d.color;
        		}
    	    });
    });

    feature.updater(function (elems, xScale) {
    	elems
    	    .select("rect")
    	    .attr("width", function (d) {
        		return (xScale(d.end) - xScale(d.start));
    	    });
    });

    feature.mover(function (blocks, xScale) {
    	blocks
    	    .select("rect")
    	    .attr("x", function (d) {
        		return xScale(d.start);
    	    })
    	    .attr("width", function (d) {
        		return (xScale(d.end) - xScale(d.start));
    	    });
    });

    return feature;

};

tnt_feature.axis = function () {
    var xAxis;
    var orientation = "top";

    // Axis doesn't inherit from feature
    var feature = {};
    feature.reset = function () {
    	xAxis = undefined;
    	var track = this;
    	track.g.selectAll("rect").remove();
    	track.g.selectAll(".tick").remove();
    };
    feature.plot = function () {};
    feature.move = function () {
    	var track = this;
    	var svg_g = track.g;
    	svg_g.call(xAxis);
    };

    feature.init = function () {
        xAxis = undefined;
    };

    feature.update = function (xScale) {
    	// Create Axis if it doesn't exist
    	if (xAxis === undefined) {
    	    xAxis = d3.svg.axis()
    		.scale(xScale)
    		.orient(orientation);
    	}

    	var track = this;
    	var svg_g = track.g;
    	svg_g.call(xAxis);
    };

    feature.orientation = function (pos) {
    	if (!arguments.length) {
    	    return orientation;
    	}
    	orientation = pos;
    	return feature;
    };

    return feature;
};

tnt_feature.location = function () {
    var row;

    var feature = {};
    feature.reset = function () {
        row = undefined;
    };
    feature.plot = function () {};
    feature.init = function () {
        row = undefined;
    };
    feature.move = function(xScale) {
    	var domain = xScale.domain();
    	row.select("text")
    	    .text("Location: " + ~~domain[0] + "-" + ~~domain[1]);
    };

    feature.update = function (xScale) {
    	var track = this;
    	var svg_g = track.g;
    	var domain = xScale.domain();
    	if (row === undefined) {
    	    row = svg_g;
    	    row
        		.append("text")
        		.text("Location: " + ~~domain[0] + "-" + ~~domain[1]);
    	}
    };

    return feature;
};

module.exports = exports = tnt_feature;

},{"./layout.js":17,"tnt.api":7}],16:[function(require,module,exports){
var board = require ("./board.js");
board.track = require ("./track");
board.track.data = require ("./data.js");
board.track.layout = require ("./layout.js");
board.track.feature = require ("./feature.js");
board.track.layout = require ("./layout.js");

module.exports = exports = board;

},{"./board.js":13,"./data.js":14,"./feature.js":15,"./layout.js":17,"./track":18}],17:[function(require,module,exports){
var apijs = require ("tnt.api");

// var board = {};
// board.track = {};
var layout = function () {

    // The returned closure / object
    var l = function (new_elems, xScale)  {
        var track = this;
        l.elements().call(track, new_elems, xScale);
        return new_elems;
    };

    var api = apijs(l)
        .getset ('elements', function () {});

    return l;
};

layout.identity = function () {
    return layout()
        .elements (function (e) {
            return e;
        });
};

module.exports = exports = layout;

},{"tnt.api":7}],18:[function(require,module,exports){
var apijs = require ("tnt.api");
var iterator = require("tnt.utils").iterator;

//var board = {};

var track = function () {
    "use strict";

    var read_conf = {
    	// Unique ID for this track
    	id : track.id()
    };

    var display;

    var conf = {
    	// foreground_color : d3.rgb('#000000'),
    	background_color : d3.rgb('#CCCCCC'),
    	height           : 250,
    	// data is the object (normally a tnt.track.data object) used to retrieve and update data for the track
    	data             : track.data.empty(),
        label             : ""
    };

    // The returned object / closure
    var _ = function() {};

    // API
    var api = apijs (_)
    	.getset (conf)
    	.get (read_conf);

    // TODO: This means that height should be defined before display
    // we shouldn't rely on this
    _.display = function (new_plotter) {
        if (!arguments.length) {
            return display;
        }
        display = new_plotter;
        if (typeof (display) === 'function') {
            display.layout && display.layout().height(conf.height);
        } else {
            for (var key in display) {
                if (display.hasOwnProperty(key)) {
                    display[key].layout && display[key].layout().height(conf.height);
                }
            }
        }

        return _;
    };

    return _;
};

track.id = iterator(1);

module.exports = exports = track;

},{"tnt.api":7,"tnt.utils":9}],19:[function(require,module,exports){
module.exports = tnt_ensembl = require("./src/rest.js");

},{"./src/rest.js":34}],20:[function(require,module,exports){
(function (process,global){
/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/jakearchibald/es6-promise/master/LICENSE
 * @version   2.3.0
 */

(function() {
    "use strict";
    function lib$es6$promise$utils$$objectOrFunction(x) {
      return typeof x === 'function' || (typeof x === 'object' && x !== null);
    }

    function lib$es6$promise$utils$$isFunction(x) {
      return typeof x === 'function';
    }

    function lib$es6$promise$utils$$isMaybeThenable(x) {
      return typeof x === 'object' && x !== null;
    }

    var lib$es6$promise$utils$$_isArray;
    if (!Array.isArray) {
      lib$es6$promise$utils$$_isArray = function (x) {
        return Object.prototype.toString.call(x) === '[object Array]';
      };
    } else {
      lib$es6$promise$utils$$_isArray = Array.isArray;
    }

    var lib$es6$promise$utils$$isArray = lib$es6$promise$utils$$_isArray;
    var lib$es6$promise$asap$$len = 0;
    var lib$es6$promise$asap$$toString = {}.toString;
    var lib$es6$promise$asap$$vertxNext;
    var lib$es6$promise$asap$$customSchedulerFn;

    var lib$es6$promise$asap$$asap = function asap(callback, arg) {
      lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len] = callback;
      lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len + 1] = arg;
      lib$es6$promise$asap$$len += 2;
      if (lib$es6$promise$asap$$len === 2) {
        // If len is 2, that means that we need to schedule an async flush.
        // If additional callbacks are queued before the queue is flushed, they
        // will be processed by this flush that we are scheduling.
        if (lib$es6$promise$asap$$customSchedulerFn) {
          lib$es6$promise$asap$$customSchedulerFn(lib$es6$promise$asap$$flush);
        } else {
          lib$es6$promise$asap$$scheduleFlush();
        }
      }
    }

    function lib$es6$promise$asap$$setScheduler(scheduleFn) {
      lib$es6$promise$asap$$customSchedulerFn = scheduleFn;
    }

    function lib$es6$promise$asap$$setAsap(asapFn) {
      lib$es6$promise$asap$$asap = asapFn;
    }

    var lib$es6$promise$asap$$browserWindow = (typeof window !== 'undefined') ? window : undefined;
    var lib$es6$promise$asap$$browserGlobal = lib$es6$promise$asap$$browserWindow || {};
    var lib$es6$promise$asap$$BrowserMutationObserver = lib$es6$promise$asap$$browserGlobal.MutationObserver || lib$es6$promise$asap$$browserGlobal.WebKitMutationObserver;
    var lib$es6$promise$asap$$isNode = typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

    // test for web worker but not in IE10
    var lib$es6$promise$asap$$isWorker = typeof Uint8ClampedArray !== 'undefined' &&
      typeof importScripts !== 'undefined' &&
      typeof MessageChannel !== 'undefined';

    // node
    function lib$es6$promise$asap$$useNextTick() {
      var nextTick = process.nextTick;
      // node version 0.10.x displays a deprecation warning when nextTick is used recursively
      // setImmediate should be used instead instead
      var version = process.versions.node.match(/^(?:(\d+)\.)?(?:(\d+)\.)?(\*|\d+)$/);
      if (Array.isArray(version) && version[1] === '0' && version[2] === '10') {
        nextTick = setImmediate;
      }
      return function() {
        nextTick(lib$es6$promise$asap$$flush);
      };
    }

    // vertx
    function lib$es6$promise$asap$$useVertxTimer() {
      return function() {
        lib$es6$promise$asap$$vertxNext(lib$es6$promise$asap$$flush);
      };
    }

    function lib$es6$promise$asap$$useMutationObserver() {
      var iterations = 0;
      var observer = new lib$es6$promise$asap$$BrowserMutationObserver(lib$es6$promise$asap$$flush);
      var node = document.createTextNode('');
      observer.observe(node, { characterData: true });

      return function() {
        node.data = (iterations = ++iterations % 2);
      };
    }

    // web worker
    function lib$es6$promise$asap$$useMessageChannel() {
      var channel = new MessageChannel();
      channel.port1.onmessage = lib$es6$promise$asap$$flush;
      return function () {
        channel.port2.postMessage(0);
      };
    }

    function lib$es6$promise$asap$$useSetTimeout() {
      return function() {
        setTimeout(lib$es6$promise$asap$$flush, 1);
      };
    }

    var lib$es6$promise$asap$$queue = new Array(1000);
    function lib$es6$promise$asap$$flush() {
      for (var i = 0; i < lib$es6$promise$asap$$len; i+=2) {
        var callback = lib$es6$promise$asap$$queue[i];
        var arg = lib$es6$promise$asap$$queue[i+1];

        callback(arg);

        lib$es6$promise$asap$$queue[i] = undefined;
        lib$es6$promise$asap$$queue[i+1] = undefined;
      }

      lib$es6$promise$asap$$len = 0;
    }

    function lib$es6$promise$asap$$attemptVertex() {
      try {
        var r = require;
        var vertx = r('vertx');
        lib$es6$promise$asap$$vertxNext = vertx.runOnLoop || vertx.runOnContext;
        return lib$es6$promise$asap$$useVertxTimer();
      } catch(e) {
        return lib$es6$promise$asap$$useSetTimeout();
      }
    }

    var lib$es6$promise$asap$$scheduleFlush;
    // Decide what async method to use to triggering processing of queued callbacks:
    if (lib$es6$promise$asap$$isNode) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useNextTick();
    } else if (lib$es6$promise$asap$$BrowserMutationObserver) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMutationObserver();
    } else if (lib$es6$promise$asap$$isWorker) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMessageChannel();
    } else if (lib$es6$promise$asap$$browserWindow === undefined && typeof require === 'function') {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$attemptVertex();
    } else {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useSetTimeout();
    }

    function lib$es6$promise$$internal$$noop() {}

    var lib$es6$promise$$internal$$PENDING   = void 0;
    var lib$es6$promise$$internal$$FULFILLED = 1;
    var lib$es6$promise$$internal$$REJECTED  = 2;

    var lib$es6$promise$$internal$$GET_THEN_ERROR = new lib$es6$promise$$internal$$ErrorObject();

    function lib$es6$promise$$internal$$selfFullfillment() {
      return new TypeError("You cannot resolve a promise with itself");
    }

    function lib$es6$promise$$internal$$cannotReturnOwn() {
      return new TypeError('A promises callback cannot return that same promise.');
    }

    function lib$es6$promise$$internal$$getThen(promise) {
      try {
        return promise.then;
      } catch(error) {
        lib$es6$promise$$internal$$GET_THEN_ERROR.error = error;
        return lib$es6$promise$$internal$$GET_THEN_ERROR;
      }
    }

    function lib$es6$promise$$internal$$tryThen(then, value, fulfillmentHandler, rejectionHandler) {
      try {
        then.call(value, fulfillmentHandler, rejectionHandler);
      } catch(e) {
        return e;
      }
    }

    function lib$es6$promise$$internal$$handleForeignThenable(promise, thenable, then) {
       lib$es6$promise$asap$$asap(function(promise) {
        var sealed = false;
        var error = lib$es6$promise$$internal$$tryThen(then, thenable, function(value) {
          if (sealed) { return; }
          sealed = true;
          if (thenable !== value) {
            lib$es6$promise$$internal$$resolve(promise, value);
          } else {
            lib$es6$promise$$internal$$fulfill(promise, value);
          }
        }, function(reason) {
          if (sealed) { return; }
          sealed = true;

          lib$es6$promise$$internal$$reject(promise, reason);
        }, 'Settle: ' + (promise._label || ' unknown promise'));

        if (!sealed && error) {
          sealed = true;
          lib$es6$promise$$internal$$reject(promise, error);
        }
      }, promise);
    }

    function lib$es6$promise$$internal$$handleOwnThenable(promise, thenable) {
      if (thenable._state === lib$es6$promise$$internal$$FULFILLED) {
        lib$es6$promise$$internal$$fulfill(promise, thenable._result);
      } else if (thenable._state === lib$es6$promise$$internal$$REJECTED) {
        lib$es6$promise$$internal$$reject(promise, thenable._result);
      } else {
        lib$es6$promise$$internal$$subscribe(thenable, undefined, function(value) {
          lib$es6$promise$$internal$$resolve(promise, value);
        }, function(reason) {
          lib$es6$promise$$internal$$reject(promise, reason);
        });
      }
    }

    function lib$es6$promise$$internal$$handleMaybeThenable(promise, maybeThenable) {
      if (maybeThenable.constructor === promise.constructor) {
        lib$es6$promise$$internal$$handleOwnThenable(promise, maybeThenable);
      } else {
        var then = lib$es6$promise$$internal$$getThen(maybeThenable);

        if (then === lib$es6$promise$$internal$$GET_THEN_ERROR) {
          lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$GET_THEN_ERROR.error);
        } else if (then === undefined) {
          lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
        } else if (lib$es6$promise$utils$$isFunction(then)) {
          lib$es6$promise$$internal$$handleForeignThenable(promise, maybeThenable, then);
        } else {
          lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
        }
      }
    }

    function lib$es6$promise$$internal$$resolve(promise, value) {
      if (promise === value) {
        lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$selfFullfillment());
      } else if (lib$es6$promise$utils$$objectOrFunction(value)) {
        lib$es6$promise$$internal$$handleMaybeThenable(promise, value);
      } else {
        lib$es6$promise$$internal$$fulfill(promise, value);
      }
    }

    function lib$es6$promise$$internal$$publishRejection(promise) {
      if (promise._onerror) {
        promise._onerror(promise._result);
      }

      lib$es6$promise$$internal$$publish(promise);
    }

    function lib$es6$promise$$internal$$fulfill(promise, value) {
      if (promise._state !== lib$es6$promise$$internal$$PENDING) { return; }

      promise._result = value;
      promise._state = lib$es6$promise$$internal$$FULFILLED;

      if (promise._subscribers.length !== 0) {
        lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publish, promise);
      }
    }

    function lib$es6$promise$$internal$$reject(promise, reason) {
      if (promise._state !== lib$es6$promise$$internal$$PENDING) { return; }
      promise._state = lib$es6$promise$$internal$$REJECTED;
      promise._result = reason;

      lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publishRejection, promise);
    }

    function lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection) {
      var subscribers = parent._subscribers;
      var length = subscribers.length;

      parent._onerror = null;

      subscribers[length] = child;
      subscribers[length + lib$es6$promise$$internal$$FULFILLED] = onFulfillment;
      subscribers[length + lib$es6$promise$$internal$$REJECTED]  = onRejection;

      if (length === 0 && parent._state) {
        lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publish, parent);
      }
    }

    function lib$es6$promise$$internal$$publish(promise) {
      var subscribers = promise._subscribers;
      var settled = promise._state;

      if (subscribers.length === 0) { return; }

      var child, callback, detail = promise._result;

      for (var i = 0; i < subscribers.length; i += 3) {
        child = subscribers[i];
        callback = subscribers[i + settled];

        if (child) {
          lib$es6$promise$$internal$$invokeCallback(settled, child, callback, detail);
        } else {
          callback(detail);
        }
      }

      promise._subscribers.length = 0;
    }

    function lib$es6$promise$$internal$$ErrorObject() {
      this.error = null;
    }

    var lib$es6$promise$$internal$$TRY_CATCH_ERROR = new lib$es6$promise$$internal$$ErrorObject();

    function lib$es6$promise$$internal$$tryCatch(callback, detail) {
      try {
        return callback(detail);
      } catch(e) {
        lib$es6$promise$$internal$$TRY_CATCH_ERROR.error = e;
        return lib$es6$promise$$internal$$TRY_CATCH_ERROR;
      }
    }

    function lib$es6$promise$$internal$$invokeCallback(settled, promise, callback, detail) {
      var hasCallback = lib$es6$promise$utils$$isFunction(callback),
          value, error, succeeded, failed;

      if (hasCallback) {
        value = lib$es6$promise$$internal$$tryCatch(callback, detail);

        if (value === lib$es6$promise$$internal$$TRY_CATCH_ERROR) {
          failed = true;
          error = value.error;
          value = null;
        } else {
          succeeded = true;
        }

        if (promise === value) {
          lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$cannotReturnOwn());
          return;
        }

      } else {
        value = detail;
        succeeded = true;
      }

      if (promise._state !== lib$es6$promise$$internal$$PENDING) {
        // noop
      } else if (hasCallback && succeeded) {
        lib$es6$promise$$internal$$resolve(promise, value);
      } else if (failed) {
        lib$es6$promise$$internal$$reject(promise, error);
      } else if (settled === lib$es6$promise$$internal$$FULFILLED) {
        lib$es6$promise$$internal$$fulfill(promise, value);
      } else if (settled === lib$es6$promise$$internal$$REJECTED) {
        lib$es6$promise$$internal$$reject(promise, value);
      }
    }

    function lib$es6$promise$$internal$$initializePromise(promise, resolver) {
      try {
        resolver(function resolvePromise(value){
          lib$es6$promise$$internal$$resolve(promise, value);
        }, function rejectPromise(reason) {
          lib$es6$promise$$internal$$reject(promise, reason);
        });
      } catch(e) {
        lib$es6$promise$$internal$$reject(promise, e);
      }
    }

    function lib$es6$promise$enumerator$$Enumerator(Constructor, input) {
      var enumerator = this;

      enumerator._instanceConstructor = Constructor;
      enumerator.promise = new Constructor(lib$es6$promise$$internal$$noop);

      if (enumerator._validateInput(input)) {
        enumerator._input     = input;
        enumerator.length     = input.length;
        enumerator._remaining = input.length;

        enumerator._init();

        if (enumerator.length === 0) {
          lib$es6$promise$$internal$$fulfill(enumerator.promise, enumerator._result);
        } else {
          enumerator.length = enumerator.length || 0;
          enumerator._enumerate();
          if (enumerator._remaining === 0) {
            lib$es6$promise$$internal$$fulfill(enumerator.promise, enumerator._result);
          }
        }
      } else {
        lib$es6$promise$$internal$$reject(enumerator.promise, enumerator._validationError());
      }
    }

    lib$es6$promise$enumerator$$Enumerator.prototype._validateInput = function(input) {
      return lib$es6$promise$utils$$isArray(input);
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._validationError = function() {
      return new Error('Array Methods must be provided an Array');
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._init = function() {
      this._result = new Array(this.length);
    };

    var lib$es6$promise$enumerator$$default = lib$es6$promise$enumerator$$Enumerator;

    lib$es6$promise$enumerator$$Enumerator.prototype._enumerate = function() {
      var enumerator = this;

      var length  = enumerator.length;
      var promise = enumerator.promise;
      var input   = enumerator._input;

      for (var i = 0; promise._state === lib$es6$promise$$internal$$PENDING && i < length; i++) {
        enumerator._eachEntry(input[i], i);
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._eachEntry = function(entry, i) {
      var enumerator = this;
      var c = enumerator._instanceConstructor;

      if (lib$es6$promise$utils$$isMaybeThenable(entry)) {
        if (entry.constructor === c && entry._state !== lib$es6$promise$$internal$$PENDING) {
          entry._onerror = null;
          enumerator._settledAt(entry._state, i, entry._result);
        } else {
          enumerator._willSettleAt(c.resolve(entry), i);
        }
      } else {
        enumerator._remaining--;
        enumerator._result[i] = entry;
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._settledAt = function(state, i, value) {
      var enumerator = this;
      var promise = enumerator.promise;

      if (promise._state === lib$es6$promise$$internal$$PENDING) {
        enumerator._remaining--;

        if (state === lib$es6$promise$$internal$$REJECTED) {
          lib$es6$promise$$internal$$reject(promise, value);
        } else {
          enumerator._result[i] = value;
        }
      }

      if (enumerator._remaining === 0) {
        lib$es6$promise$$internal$$fulfill(promise, enumerator._result);
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._willSettleAt = function(promise, i) {
      var enumerator = this;

      lib$es6$promise$$internal$$subscribe(promise, undefined, function(value) {
        enumerator._settledAt(lib$es6$promise$$internal$$FULFILLED, i, value);
      }, function(reason) {
        enumerator._settledAt(lib$es6$promise$$internal$$REJECTED, i, reason);
      });
    };
    function lib$es6$promise$promise$all$$all(entries) {
      return new lib$es6$promise$enumerator$$default(this, entries).promise;
    }
    var lib$es6$promise$promise$all$$default = lib$es6$promise$promise$all$$all;
    function lib$es6$promise$promise$race$$race(entries) {
      /*jshint validthis:true */
      var Constructor = this;

      var promise = new Constructor(lib$es6$promise$$internal$$noop);

      if (!lib$es6$promise$utils$$isArray(entries)) {
        lib$es6$promise$$internal$$reject(promise, new TypeError('You must pass an array to race.'));
        return promise;
      }

      var length = entries.length;

      function onFulfillment(value) {
        lib$es6$promise$$internal$$resolve(promise, value);
      }

      function onRejection(reason) {
        lib$es6$promise$$internal$$reject(promise, reason);
      }

      for (var i = 0; promise._state === lib$es6$promise$$internal$$PENDING && i < length; i++) {
        lib$es6$promise$$internal$$subscribe(Constructor.resolve(entries[i]), undefined, onFulfillment, onRejection);
      }

      return promise;
    }
    var lib$es6$promise$promise$race$$default = lib$es6$promise$promise$race$$race;
    function lib$es6$promise$promise$resolve$$resolve(object) {
      /*jshint validthis:true */
      var Constructor = this;

      if (object && typeof object === 'object' && object.constructor === Constructor) {
        return object;
      }

      var promise = new Constructor(lib$es6$promise$$internal$$noop);
      lib$es6$promise$$internal$$resolve(promise, object);
      return promise;
    }
    var lib$es6$promise$promise$resolve$$default = lib$es6$promise$promise$resolve$$resolve;
    function lib$es6$promise$promise$reject$$reject(reason) {
      /*jshint validthis:true */
      var Constructor = this;
      var promise = new Constructor(lib$es6$promise$$internal$$noop);
      lib$es6$promise$$internal$$reject(promise, reason);
      return promise;
    }
    var lib$es6$promise$promise$reject$$default = lib$es6$promise$promise$reject$$reject;

    var lib$es6$promise$promise$$counter = 0;

    function lib$es6$promise$promise$$needsResolver() {
      throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
    }

    function lib$es6$promise$promise$$needsNew() {
      throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
    }

    var lib$es6$promise$promise$$default = lib$es6$promise$promise$$Promise;
    /**
      Promise objects represent the eventual result of an asynchronous operation. The
      primary way of interacting with a promise is through its `then` method, which
      registers callbacks to receive either a promise's eventual value or the reason
      why the promise cannot be fulfilled.

      Terminology
      -----------

      - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
      - `thenable` is an object or function that defines a `then` method.
      - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
      - `exception` is a value that is thrown using the throw statement.
      - `reason` is a value that indicates why a promise was rejected.
      - `settled` the final resting state of a promise, fulfilled or rejected.

      A promise can be in one of three states: pending, fulfilled, or rejected.

      Promises that are fulfilled have a fulfillment value and are in the fulfilled
      state.  Promises that are rejected have a rejection reason and are in the
      rejected state.  A fulfillment value is never a thenable.

      Promises can also be said to *resolve* a value.  If this value is also a
      promise, then the original promise's settled state will match the value's
      settled state.  So a promise that *resolves* a promise that rejects will
      itself reject, and a promise that *resolves* a promise that fulfills will
      itself fulfill.


      Basic Usage:
      ------------

      ```js
      var promise = new Promise(function(resolve, reject) {
        // on success
        resolve(value);

        // on failure
        reject(reason);
      });

      promise.then(function(value) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Advanced Usage:
      ---------------

      Promises shine when abstracting away asynchronous interactions such as
      `XMLHttpRequest`s.

      ```js
      function getJSON(url) {
        return new Promise(function(resolve, reject){
          var xhr = new XMLHttpRequest();

          xhr.open('GET', url);
          xhr.onreadystatechange = handler;
          xhr.responseType = 'json';
          xhr.setRequestHeader('Accept', 'application/json');
          xhr.send();

          function handler() {
            if (this.readyState === this.DONE) {
              if (this.status === 200) {
                resolve(this.response);
              } else {
                reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
              }
            }
          };
        });
      }

      getJSON('/posts.json').then(function(json) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Unlike callbacks, promises are great composable primitives.

      ```js
      Promise.all([
        getJSON('/posts'),
        getJSON('/comments')
      ]).then(function(values){
        values[0] // => postsJSON
        values[1] // => commentsJSON

        return values;
      });
      ```

      @class Promise
      @param {function} resolver
      Useful for tooling.
      @constructor
    */
    function lib$es6$promise$promise$$Promise(resolver) {
      this._id = lib$es6$promise$promise$$counter++;
      this._state = undefined;
      this._result = undefined;
      this._subscribers = [];

      if (lib$es6$promise$$internal$$noop !== resolver) {
        if (!lib$es6$promise$utils$$isFunction(resolver)) {
          lib$es6$promise$promise$$needsResolver();
        }

        if (!(this instanceof lib$es6$promise$promise$$Promise)) {
          lib$es6$promise$promise$$needsNew();
        }

        lib$es6$promise$$internal$$initializePromise(this, resolver);
      }
    }

    lib$es6$promise$promise$$Promise.all = lib$es6$promise$promise$all$$default;
    lib$es6$promise$promise$$Promise.race = lib$es6$promise$promise$race$$default;
    lib$es6$promise$promise$$Promise.resolve = lib$es6$promise$promise$resolve$$default;
    lib$es6$promise$promise$$Promise.reject = lib$es6$promise$promise$reject$$default;
    lib$es6$promise$promise$$Promise._setScheduler = lib$es6$promise$asap$$setScheduler;
    lib$es6$promise$promise$$Promise._setAsap = lib$es6$promise$asap$$setAsap;
    lib$es6$promise$promise$$Promise._asap = lib$es6$promise$asap$$asap;

    lib$es6$promise$promise$$Promise.prototype = {
      constructor: lib$es6$promise$promise$$Promise,

    /**
      The primary way of interacting with a promise is through its `then` method,
      which registers callbacks to receive either a promise's eventual value or the
      reason why the promise cannot be fulfilled.

      ```js
      findUser().then(function(user){
        // user is available
      }, function(reason){
        // user is unavailable, and you are given the reason why
      });
      ```

      Chaining
      --------

      The return value of `then` is itself a promise.  This second, 'downstream'
      promise is resolved with the return value of the first promise's fulfillment
      or rejection handler, or rejected if the handler throws an exception.

      ```js
      findUser().then(function (user) {
        return user.name;
      }, function (reason) {
        return 'default name';
      }).then(function (userName) {
        // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
        // will be `'default name'`
      });

      findUser().then(function (user) {
        throw new Error('Found user, but still unhappy');
      }, function (reason) {
        throw new Error('`findUser` rejected and we're unhappy');
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
        // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
      });
      ```
      If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.

      ```js
      findUser().then(function (user) {
        throw new PedagogicalException('Upstream error');
      }).then(function (value) {
        // never reached
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // The `PedgagocialException` is propagated all the way down to here
      });
      ```

      Assimilation
      ------------

      Sometimes the value you want to propagate to a downstream promise can only be
      retrieved asynchronously. This can be achieved by returning a promise in the
      fulfillment or rejection handler. The downstream promise will then be pending
      until the returned promise is settled. This is called *assimilation*.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // The user's comments are now available
      });
      ```

      If the assimliated promise rejects, then the downstream promise will also reject.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // If `findCommentsByAuthor` fulfills, we'll have the value here
      }, function (reason) {
        // If `findCommentsByAuthor` rejects, we'll have the reason here
      });
      ```

      Simple Example
      --------------

      Synchronous Example

      ```javascript
      var result;

      try {
        result = findResult();
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js
      findResult(function(result, err){
        if (err) {
          // failure
        } else {
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findResult().then(function(result){
        // success
      }, function(reason){
        // failure
      });
      ```

      Advanced Example
      --------------

      Synchronous Example

      ```javascript
      var author, books;

      try {
        author = findAuthor();
        books  = findBooksByAuthor(author);
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js

      function foundBooks(books) {

      }

      function failure(reason) {

      }

      findAuthor(function(author, err){
        if (err) {
          failure(err);
          // failure
        } else {
          try {
            findBoooksByAuthor(author, function(books, err) {
              if (err) {
                failure(err);
              } else {
                try {
                  foundBooks(books);
                } catch(reason) {
                  failure(reason);
                }
              }
            });
          } catch(error) {
            failure(err);
          }
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findAuthor().
        then(findBooksByAuthor).
        then(function(books){
          // found books
      }).catch(function(reason){
        // something went wrong
      });
      ```

      @method then
      @param {Function} onFulfilled
      @param {Function} onRejected
      Useful for tooling.
      @return {Promise}
    */
      then: function(onFulfillment, onRejection) {
        var parent = this;
        var state = parent._state;

        if (state === lib$es6$promise$$internal$$FULFILLED && !onFulfillment || state === lib$es6$promise$$internal$$REJECTED && !onRejection) {
          return this;
        }

        var child = new this.constructor(lib$es6$promise$$internal$$noop);
        var result = parent._result;

        if (state) {
          var callback = arguments[state - 1];
          lib$es6$promise$asap$$asap(function(){
            lib$es6$promise$$internal$$invokeCallback(state, child, callback, result);
          });
        } else {
          lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection);
        }

        return child;
      },

    /**
      `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
      as the catch block of a try/catch statement.

      ```js
      function findAuthor(){
        throw new Error('couldn't find that author');
      }

      // synchronous
      try {
        findAuthor();
      } catch(reason) {
        // something went wrong
      }

      // async with promises
      findAuthor().catch(function(reason){
        // something went wrong
      });
      ```

      @method catch
      @param {Function} onRejection
      Useful for tooling.
      @return {Promise}
    */
      'catch': function(onRejection) {
        return this.then(null, onRejection);
      }
    };
    function lib$es6$promise$polyfill$$polyfill() {
      var local;

      if (typeof global !== 'undefined') {
          local = global;
      } else if (typeof self !== 'undefined') {
          local = self;
      } else {
          try {
              local = Function('return this')();
          } catch (e) {
              throw new Error('polyfill failed because global object is unavailable in this environment');
          }
      }

      var P = local.Promise;

      if (P && Object.prototype.toString.call(P.resolve()) === '[object Promise]' && !P.cast) {
        return;
      }

      local.Promise = lib$es6$promise$promise$$default;
    }
    var lib$es6$promise$polyfill$$default = lib$es6$promise$polyfill$$polyfill;

    var lib$es6$promise$umd$$ES6Promise = {
      'Promise': lib$es6$promise$promise$$default,
      'polyfill': lib$es6$promise$polyfill$$default
    };

    /* global define:true module:true window: true */
    if (typeof define === 'function' && define['amd']) {
      define(function() { return lib$es6$promise$umd$$ES6Promise; });
    } else if (typeof module !== 'undefined' && module['exports']) {
      module['exports'] = lib$es6$promise$umd$$ES6Promise;
    } else if (typeof this !== 'undefined') {
      this['ES6Promise'] = lib$es6$promise$umd$$ES6Promise;
    }

    lib$es6$promise$polyfill$$default();
}).call(this);


}).call(this,require("IrXUsu"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"IrXUsu":3}],21:[function(require,module,exports){
/*globals define */
'use strict';


(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(function () {
            return (root.httppleasepromises = factory(root));
        });
    } else if (typeof exports === 'object') {
        module.exports = factory(root);
    } else {
        root.httppleasepromises = factory(root);
    }
}(this, function (root) { // jshint ignore:line
    return function (Promise) {
        Promise = Promise || root && root.Promise;
        if (!Promise) {
            throw new Error('No Promise implementation found.');
        }
        return {
            processRequest: function (req) {
                var resolve, reject,
                    oldOnload = req.onload,
                    oldOnerror = req.onerror,
                    promise = new Promise(function (a, b) {
                        resolve = a;
                        reject = b;
                    });
                req.onload = function (res) {
                    var result;
                    if (oldOnload) {
                        result = oldOnload.apply(this, arguments);
                    }
                    resolve(res);
                    return result;
                };
                req.onerror = function (err) {
                    var result;
                    if (oldOnerror) {
                        result = oldOnerror.apply(this, arguments);
                    }
                    reject(err);
                    return result;
                };
                req.then = function () {
                    return promise.then.apply(promise, arguments);
                };
                req['catch'] = function () {
                    return promise['catch'].apply(promise, arguments);
                };
            }
        };
    };
}));

},{}],22:[function(require,module,exports){
'use strict';

var Response = require('./response');

function RequestError(message, props) {
    var err = new Error(message);
    err.name = 'RequestError';
    this.name = err.name;
    this.message = err.message;
    if (err.stack) {
        this.stack = err.stack;
    }

    this.toString = function () {
        return this.message;
    };

    for (var k in props) {
        if (props.hasOwnProperty(k)) {
            this[k] = props[k];
        }
    }
}

RequestError.prototype = Error.prototype;

RequestError.create = function (message, req, props) {
    var err = new RequestError(message, props);
    Response.call(err, req);
    return err;
};

module.exports = RequestError;

},{"./response":25}],23:[function(require,module,exports){
'use strict';

var i,
    cleanURL = require('../plugins/cleanurl'),
    XHR = require('./xhr'),
    delay = require('./utils/delay'),
    createError = require('./error').create,
    Response = require('./response'),
    Request = require('./request'),
    extend = require('xtend'),
    once = require('./utils/once');

function factory(defaults, plugins) {
    defaults = defaults || {};
    plugins = plugins || [];

    function http(req, cb) {
        var xhr, plugin, done, k, timeoutId;

        req = new Request(extend(defaults, req));

        for (i = 0; i < plugins.length; i++) {
            plugin = plugins[i];
            if (plugin.processRequest) {
                plugin.processRequest(req);
            }
        }

        // Give the plugins a chance to create the XHR object
        for (i = 0; i < plugins.length; i++) {
            plugin = plugins[i];
            if (plugin.createXHR) {
                xhr = plugin.createXHR(req);
                break; // First come, first serve
            }
        }
        xhr = xhr || new XHR();

        req.xhr = xhr;

        // Because XHR can be an XMLHttpRequest or an XDomainRequest, we add
        // `onreadystatechange`, `onload`, and `onerror` callbacks. We use the
        // `once` util to make sure that only one is called (and it's only called
        // one time).
        done = once(delay(function (err) {
            clearTimeout(timeoutId);
            xhr.onload = xhr.onerror = xhr.onreadystatechange = xhr.ontimeout = xhr.onprogress = null;
            var res = err && err.isHttpError ? err : new Response(req);
            for (i = 0; i < plugins.length; i++) {
                plugin = plugins[i];
                if (plugin.processResponse) {
                    plugin.processResponse(res);
                }
            }
            if (err) {
                if (req.onerror) {
                    req.onerror(err);
                }
            } else {
                if (req.onload) {
                    req.onload(res);
                }
            }
            if (cb) {
                cb(err, res);
            }
        }));

        // When the request completes, continue.
        xhr.onreadystatechange = function () {
            if (req.timedOut) return;

            if (req.aborted) {
                done(createError('Request aborted', req, {name: 'Abort'}));
            } else if (xhr.readyState === 4) {
                var type = Math.floor(xhr.status / 100);
                if (type === 2) {
                    done();
                } else if (xhr.status === 404 && !req.errorOn404) {
                    done();
                } else {
                    var kind;
                    switch (type) {
                        case 4:
                            kind = 'Client';
                            break;
                        case 5:
                            kind = 'Server';
                            break;
                        default:
                            kind = 'HTTP';
                    }
                    var msg = kind + ' Error: ' +
                              'The server returned a status of ' + xhr.status +
                              ' for the request "' +
                              req.method.toUpperCase() + ' ' + req.url + '"';
                    done(createError(msg, req));
                }
            }
        };

        // `onload` is only called on success and, in IE, will be called without
        // `xhr.status` having been set, so we don't check it.
        xhr.onload = function () { done(); };

        xhr.onerror = function () {
            done(createError('Internal XHR Error', req));
        };

        // IE sometimes fails if you don't specify every handler.
        // See http://social.msdn.microsoft.com/Forums/ie/en-US/30ef3add-767c-4436-b8a9-f1ca19b4812e/ie9-rtm-xdomainrequest-issued-requests-may-abort-if-all-event-handlers-not-specified?forum=iewebdevelopment
        xhr.ontimeout = function () { /* noop */ };
        xhr.onprogress = function () { /* noop */ };

        xhr.open(req.method, req.url);

        if (req.timeout) {
            // If we use the normal XHR timeout mechanism (`xhr.timeout` and
            // `xhr.ontimeout`), `onreadystatechange` will be triggered before
            // `ontimeout`. There's no way to recognize that it was triggered by
            // a timeout, and we'd be unable to dispatch the right error.
            timeoutId = setTimeout(function () {
                req.timedOut = true;
                done(createError('Request timeout', req, {name: 'Timeout'}));
                try {
                    xhr.abort();
                } catch (err) {}
            }, req.timeout);
        }

        for (k in req.headers) {
            if (req.headers.hasOwnProperty(k)) {
                xhr.setRequestHeader(k, req.headers[k]);
            }
        }

        xhr.send(req.body);

        return req;
    }

    var method,
        methods = ['get', 'post', 'put', 'head', 'patch', 'delete'],
        verb = function (method) {
            return function (req, cb) {
                req = new Request(req);
                req.method = method;
                return http(req, cb);
            };
        };
    for (i = 0; i < methods.length; i++) {
        method = methods[i];
        http[method] = verb(method);
    }

    http.plugins = function () {
        return plugins;
    };

    http.defaults = function (newValues) {
        if (newValues) {
            return factory(extend(defaults, newValues), plugins);
        }
        return defaults;
    };

    http.use = function () {
        var newPlugins = Array.prototype.slice.call(arguments, 0);
        return factory(defaults, plugins.concat(newPlugins));
    };

    http.bare = function () {
        return factory();
    };

    http.Request = Request;
    http.Response = Response;

    return http;
}

module.exports = factory({}, [cleanURL]);

},{"../plugins/cleanurl":30,"./error":22,"./request":24,"./response":25,"./utils/delay":26,"./utils/once":27,"./xhr":28,"xtend":29}],24:[function(require,module,exports){
'use strict';

function Request(optsOrUrl) {
    var opts = typeof optsOrUrl === 'string' ? {url: optsOrUrl} : optsOrUrl || {};
    this.method = opts.method ? opts.method.toUpperCase() : 'GET';
    this.url = opts.url;
    this.headers = opts.headers || {};
    this.body = opts.body;
    this.timeout = opts.timeout || 0;
    this.errorOn404 = opts.errorOn404 != null ? opts.errorOn404 : true;
    this.onload = opts.onload;
    this.onerror = opts.onerror;
}

Request.prototype.abort = function () {
    if (this.aborted) return;
    this.aborted = true;
    this.xhr.abort();
    return this;
};

Request.prototype.header = function (name, value) {
    var k;
    for (k in this.headers) {
        if (this.headers.hasOwnProperty(k)) {
            if (name.toLowerCase() === k.toLowerCase()) {
                if (arguments.length === 1) {
                    return this.headers[k];
                }

                delete this.headers[k];
                break;
            }
        }
    }
    if (value != null) {
        this.headers[name] = value;
        return value;
    }
};


module.exports = Request;

},{}],25:[function(require,module,exports){
'use strict';

var Request = require('./request');


function Response(req) {
    var i, lines, m,
        xhr = req.xhr;
    this.request = req;
    this.xhr = xhr;
    this.headers = {};

    // Browsers don't like you trying to read XHR properties when you abort the
    // request, so we don't.
    if (req.aborted || req.timedOut) return;

    this.status = xhr.status || 0;
    this.text = xhr.responseText;
    this.body = xhr.response || xhr.responseText;
    this.contentType = xhr.contentType || (xhr.getResponseHeader && xhr.getResponseHeader('Content-Type'));

    if (xhr.getAllResponseHeaders) {
        lines = xhr.getAllResponseHeaders().split('\n');
        for (i = 0; i < lines.length; i++) {
            if ((m = lines[i].match(/\s*([^\s]+):\s+([^\s]+)/))) {
                this.headers[m[1]] = m[2];
            }
        }
    }

    this.isHttpError = this.status >= 400;
}

Response.prototype.header = Request.prototype.header;


module.exports = Response;

},{"./request":24}],26:[function(require,module,exports){
'use strict';

// Wrap a function in a `setTimeout` call. This is used to guarantee async
// behavior, which can avoid unexpected errors.

module.exports = function (fn) {
    return function () {
        var
            args = Array.prototype.slice.call(arguments, 0),
            newFunc = function () {
                return fn.apply(null, args);
            };
        setTimeout(newFunc, 0);
    };
};

},{}],27:[function(require,module,exports){
'use strict';

// A "once" utility.
module.exports = function (fn) {
    var result, called = false;
    return function () {
        if (!called) {
            called = true;
            result = fn.apply(this, arguments);
        }
        return result;
    };
};

},{}],28:[function(require,module,exports){
module.exports = window.XMLHttpRequest;

},{}],29:[function(require,module,exports){
module.exports = extend

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],30:[function(require,module,exports){
'use strict';

module.exports = {
    processRequest: function (req) {
        req.url = req.url.replace(/[^%]+/g, function (s) {
            return encodeURI(s);
        });
    }
};

},{}],31:[function(require,module,exports){
'use strict';

var jsonrequest = require('./jsonrequest'),
    jsonresponse = require('./jsonresponse');

module.exports = {
    processRequest: function (req) {
        jsonrequest.processRequest.call(this, req);
        jsonresponse.processRequest.call(this, req);
    },
    processResponse: function (res) {
        jsonresponse.processResponse.call(this, res);
    }
};

},{"./jsonrequest":32,"./jsonresponse":33}],32:[function(require,module,exports){
'use strict';

module.exports = {
    processRequest: function (req) {
        var
            contentType = req.header('Content-Type'),
            hasJsonContentType = contentType &&
                                 contentType.indexOf('application/json') !== -1;

        if (contentType != null && !hasJsonContentType) {
            return;
        }

        if (req.body) {
            if (!contentType) {
                req.header('Content-Type', 'application/json');
            }

            req.body = JSON.stringify(req.body);
        }
    }
};

},{}],33:[function(require,module,exports){
'use strict';

module.exports = {
    processRequest: function (req) {
        var accept = req.header('Accept');
        if (accept == null) {
            req.header('Accept', 'application/json');
        }
    },
    processResponse: function (res) {
        // Check to see if the contentype is "something/json" or
        // "something/somethingelse+json"
        if (res.contentType && /^.*\/(?:.*\+)?json(;|$)/i.test(res.contentType)) {
            var raw = typeof res.body === 'string' ? res.body : res.text;
            if (raw) {
                res.body = JSON.parse(raw);
            }
        }
    }
};

},{}],34:[function(require,module,exports){
var http = require("httpplease");
var apijs = require("tnt.api");
var promises = require('httpplease-promises');
var Promise = require('es6-promise').Promise;
var json = require("httpplease/plugins/json");
http = http.use(json).use(promises(Promise));

tnt_eRest = function() {

    var config = {
        proxyUrl : "https://rest.ensembl.org"
    };
    // Prefixes to use the REST API.
    //var proxyUrl = "https://rest.ensembl.org";
    //var prefix_region = prefix + "/overlap/region/";
    //var prefix_ensgene = prefix + "/lookup/id/";
    //var prefix_xref = prefix + "/xrefs/symbol/";
    //var prefix_homologues = prefix + "/homology/id/";
    //var prefix_chr_info = prefix + "/info/assembly/";
    //var prefix_aln_region = prefix + "/alignment/region/";
    //var prefix_gene_tree = prefix + "/genetree/id/";
    //var prefix_assembly = prefix + "/info/assembly/";
    //var prefix_sequence = prefix + "/sequence/region/";
    //var prefix_variation = prefix + "/variation/";

    // Number of connections made to the database
    var connections = 0;

    var eRest = function() {
    };

    // Limits imposed by the ensembl REST API
    eRest.limits = {
        region : 5000000
    };

    var api = apijs (eRest);

    api.getset (config);

    /** <strong>call</strong> makes an asynchronous call to the ensembl REST service.
	@param {Object} object - A literal object containing the following fields:
	<ul>
	<li>url => The rest URL. This is returned by {@link eRest.url}</li>
	<li>success => A callback to be called when the REST query is successful (i.e. the response from the server is a defined value and no error has been returned)</li>
	<li>error => A callback to be called when the REST query returns an error
	</ul>
    */
    api.method ('call', function (myurl, data) {
	if (data) {
	    return http.post({
		"url": myurl,
		"body" : data
	    })
	}
	return http.get({
	    "url": myurl
	});
    });
    // api.method ('call', function (obj) {
    // 	var url = obj.url;
    // 	var on_success = obj.success;
    // 	var on_error   = obj.error;
    // 	connections++;
    // 	http.get({
    // 	    "url" : url
    // 	}, function (error, resp) {
    // 	    if (resp !== undefined && error == null && on_success !== undefined) {
    // 		on_success(JSON.parse(resp.body));
    // 	    }
    // 	    if (error !== null && on_error !== undefined) {
    // 		on_error(error);
    // 	    }
    // 	});
    // });


    eRest.url = {};
    var url_api = apijs (eRest.url);
	/** eRest.url.<strong>region</strong> returns the ensembl REST url to retrieve the genes included in the specified region
	    @param {object} obj - An object literal with the following fields:<br />
<ul>
<li>species : The species the region refers to</li>
<li>chr     : The chr (or seq_region name)</li>
<li>from    : The start position of the region in the chr</li>
<li>to      : The end position of the region (from < to always)</li>
</ul>
            @returns {string} - The url to query the Ensembl REST server. For an example of output of these urls see the {@link http://beta.rest.ensembl.org/feature/region/homo_sapiens/13:32889611-32973805.json?feature=gene|Ensembl REST API example}
	    @example
eRest.call ( url     : eRest.url.region ({ species : "homo_sapiens", chr : "13", from : 32889611, to : 32973805 }),
             success : callback,
             error   : callback
	   );
	 */
     url_api.method ('region', function(obj) {
         var prefix_region = "/overlap/region/";
         var features = obj.features || ["gene"];
         var feature_options = features.map (function (d) {
             return "feature=" + d;
         });
         var feature_options_url = feature_options.join("&");
         return config.proxyUrl + prefix_region +
         obj.species +
         "/" +
         obj.chr +
         ":" +
         obj.from +
         "-" + obj.to +
         //".json?feature=gene";
         ".json?" + feature_options_url;
     });

	/** eRest.url.<strong>species_gene</strong> returns the ensembl REST url to retrieve the ensembl gene associated with
	    the given name in the specified species.
	    @param {object} obj - An object literal with the following fields:<br />
<ul>
<li>species   : The species the region refers to</li>
<li>gene_name : The name of the gene</li>
</ul>
            @returns {string} - The url to query the Ensembl REST server. For an example of output of these urls see the {@link http://beta.rest.ensembl.org/xrefs/symbol/human/BRCA2.json?object_type=gene|Ensembl REST API example}
	    @example
eRest.call ( url     : eRest.url.species_gene ({ species : "human", gene_name : "BRCA2" }),
             success : callback,
             error   : callback
	   );
	 */
    url_api.method ('xref', function (obj) {
        var prefix_xref = "/xrefs/symbol/";
        return config.proxyUrl + prefix_xref +
            obj.species  +
            "/" +
            obj.name +
            ".json?object_type=gene";
    });

	/** eRest.url.<strong>homologues</strong> returns the ensembl REST url to retrieve the homologues (orthologues + paralogues) of the given ensembl ID.
	    @param {object} obj - An object literal with the following fields:<br />
<ul>
<li>id : The Ensembl ID of the gene</li>
</ul>
            @returns {string} - The url to query the Ensembl REST server. For an example of output of these urls see the {@link http://beta.rest.ensembl.org/homology/id/ENSG00000139618.json?format=condensed;sequence=none;type=all|Ensembl REST API example}
	    @example
eRest.call ( url     : eRest.url.homologues ({ id : "ENSG00000139618" }),
             success : callback,
             error   : callback
	   );
	 */
    url_api.method ('homologues', function(obj) {
        var prefix_homologues = "/homology/id/";
        return config.proxyUrl + prefix_homologues +
            obj.id +
            ".json?format=condensed;sequence=none;type=all";
    });

	/** eRest.url.<strong>gene</strong> returns the ensembl REST url to retrieve the ensembl gene associated with
	    the given ID
	    @param {object} obj - An object literal with the following fields:<br />
<ul>
<li>id : The name of the gene</li>
<li>expand : if transcripts should be included in the response (default to 0)</li>
</ul>
            @returns {string} - The url to query the Ensembl REST server. For an example of output of these urls see the {@link http://beta.rest.ensembl.org/lookup/ENSG00000139618.json?format=full|Ensembl REST API example}
	    @example
eRest.call ( url     : eRest.url.gene ({ id : "ENSG00000139618" }),
             success : callback,
             error   : callback
	   );
	 */
    url_api.method ('gene', function(obj) {
        var prefix_ensgene = "/lookup/id/";
        var url = config.proxyUrl + prefix_ensgene + obj.id + ".json?format=full";
        if (obj.expand && obj.expand === 1) {
            url = url + "&expand=1";
        }
        return url;
    });

	/** eRest.url.<strong>chr_info</strong> returns the ensembl REST url to retrieve the information associated with the chromosome (seq_region in Ensembl nomenclature).
	    @param {object} obj - An object literal with the following fields:<br />
<ul>
<li>species : The species the chr (or seq_region) belongs to
<li>chr     : The name of the chr (or seq_region)</li>
</ul>
            @returns {string} - The url to query the Ensembl REST server. For an example of output of these urls see the {@link http://beta.rest.ensembl.org/assembly/info/homo_sapiens/13.json?format=full|Ensembl REST API example}
	    @example
eRest.call ( url     : eRest.url.chr_info ({ species : "homo_sapiens", chr : "13" }),
             success : callback,
             error   : callback
	   );
	 */
    url_api.method ('chr_info', function(obj) {
        var prefix_chr_info = "/info/assembly/";
        return config.proxyUrl + prefix_chr_info +
            obj.species +
            "/" +
            obj.chr +
            ".json?format=full";
    });

	// TODO: For now, it only works with species_set and not species_set_groups
	// Should be extended for wider use
    url_api.method ('aln_block', function (obj) {
        var prefix_aln_region = "/alignment/region/";
        var url = config.proxyUrl + prefix_aln_region +
            obj.species +
            "/" +
            obj.chr +
            ":" +
            obj.from +
            "-" +
            obj.to +
            ".json?method=" +
            obj.method;

        for (var i=0; i<obj.species_set.length; i++) {
            url += "&species_set=" + obj.species_set[i];
        }

        return url;
    });

    url_api.method ('sequence', function (obj) {
        var prefix_sequence = "/sequence/region/";
        return config.proxyUrl + prefix_sequence +
            obj.species +
            '/' +
            obj.chr +
            ':' +
            obj.from +
            '..' +
            obj.to +
            '?content-type=application/json';
    });

    url_api.method ('variation', function (obj) {
	// For now, only post requests are included
        var prefix_variation = "/variation/";
        return config.proxyUrl + prefix_variation +
            obj.species;
        });

    url_api.method ('gene_tree', function (obj) {
        var prefix_gene_tree = "/genetree/id/";
        return config.proxyUrl + prefix_gene_tree +
            obj.id +
            ".json?sequence=" +
            ((obj.sequence || obj.aligned) ? 1 : "none") +
            (obj.aligned ? '&aligned=1' : '');
    });

    url_api.method('assembly', function (obj) {
        var prefix_assembly = "/info/assembly/";
        return config.proxyUrl + prefix_assembly +
            obj.species +
            ".json";
        });


    api.method ('connections', function() {
	return connections;
    });

    return eRest;
};

module.exports = exports = tnt_eRest;

},{"es6-promise":20,"httpplease":23,"httpplease-promises":21,"httpplease/plugins/json":31,"tnt.api":4}],35:[function(require,module,exports){
module.exports = tooltip = require("./src/tooltip.js");

},{"./src/tooltip.js":36}],36:[function(require,module,exports){
var apijs = require("tnt.api");

var tooltip = function () {
    "use strict";

    var drag = d3.behavior.drag();
    var tooltip_div;

    var conf = {
	position : "right",
	allow_drag : true,
	show_closer : true,
	fill : function () { throw "fill is not defined in the base object"; },
	width : 180,
	id : 1
    };

    var t = function (data, event) {
	drag
	    .origin(function(){
		return {x:parseInt(d3.select(this).style("left")),
			y:parseInt(d3.select(this).style("top"))
		       };
	    })
	    .on("drag", function() {
		if (conf.allow_drag) {
		    d3.select(this)
			.style("left", d3.event.x + "px")
			.style("top", d3.event.y + "px");
		}
	    });

	// TODO: Why do we need the div element?
	// It looks like if we anchor the tooltip in the "body"
	// The tooltip is not located in the right place (appears at the bottom)
	// See clients/tooltips_test.html for an example
	var containerElem = selectAncestor (this, "div");
	if (containerElem === undefined) {
	    // We require a div element at some point to anchor the tooltip
	    return;
	}

	tooltip_div = d3.select(containerElem)
	    .append("div")
	    .attr("class", "tnt_tooltip")
	    .classed("tnt_tooltip_active", true)  // TODO: Is this needed/used???
	    .call(drag);

	// prev tooltips with the same header
	d3.select("#tnt_tooltip_" + conf.id).remove();

	if ((d3.event === null) && (event)) {
	    d3.event = event;
	}
	var d3mouse = d3.mouse(containerElem);
	d3.event = null;

	var offset = 0;
	if (conf.position === "left") {
	    offset = conf.width;
	}

	tooltip_div.attr("id", "tnt_tooltip_" + conf.id);

	// We place the tooltip
	tooltip_div
	    .style("left", (d3mouse[0]) + "px")
	    .style("top", (d3mouse[1]) + "px");

	// Close
    if (conf.show_closer) {
        tooltip_div
            .append("div")
            .attr("class", "tnt_tooltip_closer")
            .on ("click", function () {
                t.close();
            })
    }

	conf.fill.call(tooltip_div, data);

	// return this here?
	return t;
    };

    // gets the first ancestor of elem having tagname "type"
    // example : var mydiv = selectAncestor(myelem, "div");
    function selectAncestor (elem, type) {
	type = type.toLowerCase();
	if (elem.parentNode === null) {
	    console.log("No more parents");
	    return undefined;
	}
	var tagName = elem.parentNode.tagName;

	if ((tagName !== undefined) && (tagName.toLowerCase() === type)) {
	    return elem.parentNode;
	} else {
	    return selectAncestor (elem.parentNode, type);
	}
    }

    var api = apijs(t)
	.getset(conf);
    api.check('position', function (val) {
	return (val === 'left') || (val === 'right');
    }, "Only 'left' or 'right' values are allowed for position");

    api.method('close', function () {
        if (tooltip_div) {
            tooltip_div.remove();
        }
    });

    return t;
};

tooltip.list = function () {
    // list tooltip is based on general tooltips
    var t = tooltip();
    var width = 180;

    t.fill (function (obj) {
	var tooltip_div = this;
	var obj_info_list = tooltip_div
	    .append("table")
	    .attr("class", "tnt_zmenu")
	    .attr("border", "solid")
	    .style("width", t.width() + "px");

	// Tooltip header
    if (obj.header) {
        obj_info_list
	       .append("tr")
	       .attr("class", "tnt_zmenu_header")
           .append("th")
           .text(obj.header);
    }

	// Tooltip rows
	var table_rows = obj_info_list.selectAll(".tnt_zmenu_row")
	    .data(obj.rows)
	    .enter()
	    .append("tr")
	    .attr("class", "tnt_zmenu_row");

	table_rows
	    .append("td")
	    .style("text-align", "center")
	    .html(function(d,i) {
		return obj.rows[i].value;
	    })
	    .each(function (d) {
		if (d.link === undefined) {
		    return;
		}
		d3.select(this)
		    .classed("link", 1)
		    .on('click', function (d) {
			d.link(d.obj);
			t.close.call(this);
		    });
	    });
    });
    return t;
};

tooltip.table = function () {
    // table tooltips are based on general tooltips
    var t = tooltip();

    var width = 180;

    t.fill (function (obj) {
	var tooltip_div = this;

	var obj_info_table = tooltip_div
	    .append("table")
	    .attr("class", "tnt_zmenu")
	    .attr("border", "solid")
	    .style("width", t.width() + "px");

	// Tooltip header
    if (obj.header) {
        obj_info_table
            .append("tr")
            .attr("class", "tnt_zmenu_header")
            .append("th")
            .attr("colspan", 2)
            .text(obj.header);
    }

	// Tooltip rows
	var table_rows = obj_info_table.selectAll(".tnt_zmenu_row")
	    .data(obj.rows)
	    .enter()
	    .append("tr")
	    .attr("class", "tnt_zmenu_row");

	table_rows
	    .append("th")
	    .attr("colspan", function (d, i) {
		if (d.value === "") {
		    return 2;
		}
		return 1;
	    })
	    .attr("class", function (d) {
		if (d.value === "") {
		    return "tnt_zmenu_inner_header";
		}
		return "tnt_zmenu_cell";
	    })
	    .html(function(d,i) {
		return obj.rows[i].label;
	    });

	table_rows
	    .append("td")
	    .html(function(d,i) {
		if (typeof obj.rows[i].value === 'function') {
		    obj.rows[i].value.call(this, d);
		} else {
		    return obj.rows[i].value;
		}
	    })
	    .each(function (d) {
		if (d.value === "") {
		    d3.select(this).remove();
		}
	    })
	    .each(function (d) {
		if (d.link === undefined) {
		    return;
		}
		d3.select(this)
		    .classed("link", 1)
		    .on('click', function (d) {
			d.link(d.obj);
			t.close.call(this);
		    });
	    });
    });

    return t;
};

tooltip.plain = function () {
    // plain tooltips are based on general tooltips
    var t = tooltip();

    t.fill (function (obj) {
	var tooltip_div = this;

	var obj_info_table = tooltip_div
	    .append("table")
	    .attr("class", "tnt_zmenu")
	    .attr("border", "solid")
	    .style("width", t.width() + "px");

    if (obj.header) {
        obj_info_table
            .append("tr")
            .attr("class", "tnt_zmenu_header")
            .append("th")
            .text(obj.header);
    }

    if (obj.body) {
        obj_info_table
            .append("tr")
            .attr("class", "tnt_zmenu_row")
            .append("td")
            .style("text-align", "center")
            .html(obj.body);
    }
    });

    return t;
};

module.exports = exports = tooltip;

},{"tnt.api":4}],37:[function(require,module,exports){
arguments[4][9][0].apply(exports,arguments)
},{"./src/index.js":38}],38:[function(require,module,exports){
arguments[4][10][0].apply(exports,arguments)
},{"./reduce.js":39,"./utils.js":40}],39:[function(require,module,exports){
module.exports=require(11)
},{}],40:[function(require,module,exports){

module.exports = {
    iterator : function(init_val) {
	var i = init_val || 0;
	var iter = function () {
	    return i++;
	};
	return iter;
    },

    script_path : function (script_name) { // script_name is the filename
	var script_scaped = script_name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
	var script_re = new RegExp(script_scaped + '$');
	var script_re_sub = new RegExp('(.*)' + script_scaped + '$');

	// TODO: This requires phantom.js or a similar headless webkit to work (document)
	var scripts = document.getElementsByTagName('script');
	var path = "";  // Default to current path
	if(scripts !== undefined) {
            for(var i in scripts) {
		if(scripts[i].src && scripts[i].src.match(script_re)) {
                    return scripts[i].src.replace(script_re_sub, '$1');
		}
            }
	}
	return path;
    },

    defer_cancel : function (cbak, time) {
	var tick;

	var defer_cancel = function () {
	    var args = Array.prototype.slice.call(arguments);
	    var that = this;
	    clearTimeout(tick);
	    tick = setTimeout (function () {
		cbak.apply (that, args);
	    }, time);
	};

	return defer_cancel;
    }
};

},{}],41:[function(require,module,exports){
var board = require("tnt.board");
var apijs = require("tnt.api");
//var ensemblRestAPI = require("tnt.ensembl");

board.track.data.retriever.ensembl = function () {
    var success = [function () {}];
    var ignore = function () { return false; };
    //var extra = []; // extra fields to be passed to the rest api
    var eRest = board.track.data.genome.rest;
    var update_track = function (obj) {
        var data_parent = this;
        // Object has loc and a plug-in defined callback
        var loc = obj.loc;
        if (Object.keys(update_track.extra()).length) {
            var extra = update_track.extra();
            for (var item in extra) {
                if (extra.hasOwnProperty(item)) {
                    loc[item] = extra[item];
                }
            }
        }
        var plugin_cbak = obj.on_success;
        var url = eRest.url[update_track.endpoint()](loc);
        if (ignore (loc)) {
            data_parent.elements([]);
            plugin_cbak();
        } else {
            eRest.call(url)
            .then (function (resp) {
                // User defined
                for (var i=0; i<success.length; i++) {
                    var mod = success[i](resp.body);
                    if (mod) {
                        resp.body = mod;
                    }
                }
                data_parent.elements(resp.body);

                // plug-in defined
                plugin_cbak();
            });
        }
    };
    apijs (update_track)
    .getset ('endpoint')
    .getset ('extra', {})

    // TODO: We don't have a way of resetting the success array
    // TODO: Should this also be included in the sync retriever?
    // Still not sure this is the best option to support more than one callback
    update_track.success = function (cb) {
        if (!arguments.length) {
            return success;
        }
        success.push (cb);
        return update_track;
    };

    update_track.ignore = function (cb) {
        if (!arguments.length) {
            return ignore;
        }
        ignore = cb;
        return update_track;
    };

    return update_track;
};


// A predefined track for sequences
var data_sequence = function () {
    var limit = 150;
    var track_data = board.track.data();

    var updater = board.track.data.retriever.ensembl()
    .ignore (function (loc) {
        return (loc.to - loc.from) > limit;
    })
    .endpoint("sequence")
    .success (function (resp) {
        // Get the coordinates
        var fields = resp.id.split(":");
        var from = fields[3];
        var nts = [];
        for (var i=0; i<resp.seq.length; i++) {
            nts.push({
                pos: +from + i,
                sequence: resp.seq[i]
            });
        }
        return nts;
    });

    track_data.limit = function (newlim) {
        if (!arguments.length) {
            return limit;
        }
        limit = newlim;
        return this;
    };

    return track_data.update(updater);
};

// A predefined track for genes
var data_gene = function () {
    var updater = board.track.data.retriever.ensembl()
    .endpoint ("region")
    // TODO: If success is defined here, means that it can't be user-defined
    // is that good? enough? API?
    // UPDATE: Now success is backed up by an array. Still don't know if this is the best option
    .success (function (genes) {
        for (var i = 0; i < genes.length; i++) {
            if (genes[i].strand === -1) {
                genes[i].display_label = "<" + genes[i].external_name;
            } else {
                genes[i].display_label = genes[i].external_name + ">";
            }
        }
    });
    return board.track.data().update(updater);
};

var data_transcript = function () {
    var updater = board.track.data.retriever.ensembl()
    .endpoint ("region")
    .extra ({
        "features" : ["gene", "transcript", "exon", "cds"],
    })
     .success (function (elems) {
        var transcripts = {};
        var genes = {};
        for (var i=0; i<elems.length; i++) {
            var elem = elems[i];
            switch (elem.feature_type) {
                case "gene" :
                genes[elem.id] = elem;
                break;
                case "transcript" :
                var newTranscript = {
                    "id" : elem.id,
                    "label" : elem.external_name,
                    "name" : elem.strand === -1 ? ("<" + elem.external_name) : (elem.external_name + ">"),
                    "start" : elem.start,
                    "end" : elem.end,
                    "strand" : elem.strand,
                    "gene" : genes[elem.Parent],
                    "transcript" : elem,
                    "rawExons" : []
                };
                transcripts[elem.id] = newTranscript;
                break;

                case "exon" :
                var newExon = {
                    "transcript" : elem.Parent,
                    "start" : elem.start,
                    "end" : elem.end
                };
                transcripts[elem.Parent].rawExons.push(newExon)
                break;

                case "cds" :
                if (transcripts[elem.Parent].Translation === undefined) {
                    transcripts[elem.Parent].Translation = {};
                }
                var cdsStart = transcripts[elem.Parent].Translation.start;
                if ((cdsStart === undefined) || (cdsStart > elem.start)) {
                    transcripts[elem.Parent].Translation.start = elem.start;
                }

                var cdsEnd = transcripts[elem.Parent].Translation.end;
                if ((cdsEnd === undefined) || (cdsEnd < elem.end)) {
                    transcripts[elem.Parent].Translation.end = elem.end;
                }
                break;
            }
        }
        var ts = [];
        for (var id in transcripts) {
            if (transcripts.hasOwnProperty(id)) {
                var t = transcripts[id];
                var obj = exonsToExonsAndIntrons (transformExons(t), t);
                obj.name = [{
                    pos: t.start,
                    name : t.name,
                    strand : t.strand,
                    transcript : t
                }];
                obj.key = (t.id + "_" + obj.exons.length)
                obj.id = t.id;
                obj.gene = t.gene;
                obj.transcript = t.transcript;
                obj.external_name = t.label;
                obj.display_label = t.name;
                obj.start = t.start;
                obj.end = t.end;
                ts.push(obj)
            }
        }
        return ts;

    });

    function exonsToExonsAndIntrons (exons, t) {
        var obj = {};
        obj.exons = exons;
        obj.introns = [];
        for (var i=0; i<exons.length-1; i++) {
            var intron = {
                start : exons[i].transcript.strand === 1 ? exons[i].end : exons[i].start,
                end   : exons[i].transcript.strand === 1 ? exons[i+1].start : exons[i+1].end,
                transcript : t
            };
            obj.introns.push(intron);
        }
        return obj;
    }


    function transformExons (transcript) {
        var translationStart;
        var translationEnd;
        if (transcript.Translation !== undefined) {
            translationStart = transcript.Translation.start;
            translationEnd = transcript.Translation.end;
        }
        var exons = transcript.rawExons;

        var newExons = [];
        for (var i=0; i<exons.length; i++) {
            if (transcript.Translation === undefined) { // NO coding transcript
                newExons.push({
                    start   : exons[i].start,
                    end     : exons[i].end,
                    transcript : transcript,
                    coding  : false,
                    offset  : exons[i].start - transcript.start
                });
            } else {
                if (exons[i].start < translationStart) {
                    // 5'
                    if (exons[i].end < translationStart) {
                        // Completely non coding
                        newExons.push({
                            start  : exons[i].start,
                            end    : exons[i].end,
                            transcript : transcript,
                            coding : false,
                            offset  : exons[i].start - transcript.start
                        });
                    } else {
                        // Has 5'UTR
                        var ncExon5 = {
                            start  : exons[i].start,
                            end    : translationStart,
                            transcript : transcript,
                            coding : false,
                            offset  : exons[i].start - transcript.start
                        };
                        var codingExon5 = {
                            start  : translationStart,
                            end    : exons[i].end,
                            transcript : transcript,
                            coding : true,
                            offset  : exons[i].start - transcript.start
                        };
                        if (exons[i].strand === 1) {
                            newExons.push(ncExon5);
                            newExons.push(codingExon5);
                        } else {
                            newExons.push(codingExon5);
                            newExons.push(ncExon5);
                        }
                    }
                } else if (exons[i].end > translationEnd) {
                    // 3'
                    if (exons[i].start > translationEnd) {
                        // Completely non coding
                        newExons.push({
                            start   : exons[i].start,
                            end     : exons[i].end,
                            transcript : transcript,
                            coding  : false,
                            offset  : exons[i].start - transcript.start
                        });
                    } else {
                        // Has 3'UTR
                        var codingExon3 = {
                            start  : exons[i].start,
                            end    : translationEnd,
                            transcript : transcript,
                            coding : true,
                            offset  : exons[i].start - transcript.start
                        };
                        var ncExon3 = {
                            start  : translationEnd,
                            end    : exons[i].end,
                            transcript : transcript,
                            coding : false,
                            offset  : exons[i].start - transcript.start
                        };
                        if (exons[i].strand === 1) {
                            newExons.push(codingExon3);
                            newExons.push(ncExon3);
                        } else {
                            newExons.push(ncExon3);
                            newExons.push(codingExon3);
                        }
                    }
                } else {
                    // coding exon
                    newExons.push({
                        start  : exons[i].start,
                        end    : exons[i].end,
                        transcript : transcript,
                        coding : true,
                        offset  : exons[i].start - transcript.start
                    });
                }
            }
        }
        return newExons;
    }

    return board.track.data().update(updater);
};

// export
var genome_data = {
    gene : data_gene,
    sequence : data_sequence,
    transcript : data_transcript
};

module.exports = exports = genome_data;

},{"tnt.api":4,"tnt.board":6}],42:[function(require,module,exports){
var apijs = require ("tnt.api");
var layout = require("./layout.js");
var board = require("tnt.board");

var tnt_feature_transcript = function () {
    var feature = board.track.feature()
        .layout (board.track.layout.feature())
        .index (function (d) {
            return d.key;
        });

    feature.create (function (new_elems, xScale) {
        var track = this;
        var gs = new_elems
            .append("g")
            .attr("transform", function (d) {
                return "translate(" + xScale(d.start) + "," + (feature.layout().gene_slot().slot_height * d.slot) + ")";
            });

        gs
            .append("line")
            .attr("x1", 0)
            .attr("y1", ~~(feature.layout().gene_slot().gene_height/2))
            .attr("x2", function (d) {
                return (xScale(d.end) - xScale(d.start));
            })
            .attr("y2", ~~(feature.layout().gene_slot().gene_height/2))
            .attr("fill", "none")
            .attr("stroke", track.background_color())
            .attr("stroke-width", 2)
            .transition()
            .duration(500)
            .attr("stroke", function (d) {
                return feature.foreground_color()(d);
            });
            //.attr("stroke", feature.foreground_color());

        // exons
        // pass the "slot" to the exons and introns
        new_elems.each (function (d) {
            if (d.exons) {
                for (var i=0; i<d.exons.length; i++) {
                    d.exons[i].slot = d.slot;
                }
            }
        });

        var exons = gs.selectAll(".exons")
            .data(function (d) {
                return d.exons || [];
            }, function (d) {
                return d.start;
            });

        exons
            .enter()
            .append("rect")
            .attr("class", "tnt_exons")
            .attr("x", function (d) {
                return (xScale(d.start + d.offset) - xScale(d.start));
            })
            .attr("y", 0)
            .attr("width", function (d) {
                return (xScale(d.end) - xScale(d.start));
            })
            .attr("height", feature.layout().gene_slot().gene_height)
            .attr("fill", track.background_color())
            .attr("stroke", track.background_color())
            .transition()
            .duration(500)
            //.attr("stroke", feature.foreground_color())
            .attr("stroke", function (d) {
                return feature.foreground_color()(d);
            })
            .attr("fill", function (d) {
                if (d.coding) {
                     return feature.foreground_color()(d);
                }
                if (d.coding === false) {
                    return track.background_color();
                    // return "pink";
                }
                return feature.foreground_color()(d);
            });

        // labels
        gs
            .append("text")
            .attr("class", "tnt_name")
            .attr("x", 0)
            .attr("y", 25)
            .attr("fill", track.background_color())
            .text(function (d) {
                if (feature.layout().gene_slot().show_label) {
                    return d.display_label;
                } else {
                    return "";
                }
            })
            .style("font-weight", "normal")
            .transition()
            .duration(500)
            .attr("fill", feature.foreground_color());

    })

    feature.updater (function (transcripts, xScale) {
        var track = this;
        var gs = transcripts.select("g")
            .transition()
            .duration(200)
            .attr("transform", function (d) {
                return "translate(" + xScale(d.start) + "," + (feature.layout().gene_slot().slot_height * d.slot) + ")";
            });
        gs
            .selectAll ("rect")
            .attr("height", feature.layout().gene_slot().gene_height);
        gs
            .selectAll("line")
            .attr("x2", function (d) {
                return (xScale(d.end) - xScale(d.start));
            })
            .attr("y1", ~~(feature.layout().gene_slot().gene_height/2))
            .attr("y2", ~~(feature.layout().gene_slot().gene_height/2));
        gs
            .select ("text")
            .text (function (d) {
                if (feature.layout().gene_slot().show_label) {
                    return d.display_label;
                }
                return "";
            });
    });

    feature.mover (function (transcripts, xScale) {
        var gs = transcripts.select("g")
            .attr("transform", function (d) {
                return "translate(" + xScale(d.start) + "," + (feature.layout().gene_slot().slot_height * d.slot) + ")";
            });
        gs.selectAll("line")
            .attr("x2", function (d) {
                return (xScale(d.end) - xScale(d.start));
            })
            .attr("y1", ~~(feature.layout().gene_slot().gene_height/2))
            .attr("y2", ~~(feature.layout().gene_slot().gene_height/2))
            // .attr("width", function (d) {
            //     return (xScale(d.end) - xScale(d.start));
            // })
        gs.selectAll("rect")
            .attr("width", function (d) {
                return (xScale(d.end) - xScale(d.start));
            })
        gs.selectAll(".tnt_exons")
            .attr("x", function (d) {
                return (xScale(d.start + d.offset) - xScale(d.start));
            });

    });

    return feature;
};


var tnt_feature_sequence = function () {

    var config = {
        fontsize : 10,
        sequence : function (d) {
            return d.sequence;
        }
    };

    // 'Inherit' from tnt.track.feature
    var feature = board.track.feature()
    .index (function (d) {
        return d.pos;
    });

    var api = apijs (feature)
    .getset (config);


    feature.create (function (new_nts, xScale) {
        var track = this;

        new_nts
            .append("text")
            .attr("fill", track.background_color())
            .style('font-size', config.fontsize + "px")
            .attr("x", function (d) {
                return xScale (d.pos);
            })
            .attr("y", function (d) {
                return ~~(track.height() / 2) + 5;
            })
            .style("font-family", '"Lucida Console", Monaco, monospace')
            .text(config.sequence)
            .transition()
            .duration(500)
            .attr('fill', feature.foreground_color());
    });

    feature.mover (function (nts, xScale) {
        nts.select ("text")
            .attr("x", function (d) {
                return xScale(d.pos);
            });
        });

    return feature;
};

var tnt_feature_gene = function () {

    // 'Inherit' from tnt.track.feature
    var feature = board.track.feature()
	.layout(board.track.layout.feature())
	.index(function (d) {
	    return d.id;
	});

    feature.create(function (new_elems, xScale) {
	var track = this;
	new_elems
	    .append("rect")
	    .attr("x", function (d) {
		return xScale(d.start);
	    })
	    .attr("y", function (d) {
		return feature.layout().gene_slot().slot_height * d.slot;
	    })
	    .attr("width", function (d) {
		return (xScale(d.end) - xScale(d.start));
	    })
	    .attr("height", feature.layout().gene_slot().gene_height)
	    .attr("fill", track.background_color())
	    .transition()
	    .duration(500)
	    .attr("fill", function (d) {
		if (d.color === undefined) {
		    return feature.foreground_color();
		} else {
		    return d.color;
		}
	    });

	new_elems
	    .append("text")
	    .attr("class", "tnt_name")
	    .attr("x", function (d) {
		return xScale(d.start);
	    })
	    .attr("y", function (d) {
		return (feature.layout().gene_slot().slot_height * d.slot) + 25;
	    })
	    .attr("fill", track.background_color())
	    .text(function (d) {
		if (feature.layout().gene_slot().show_label) {
		    return d.display_label;
		} else {
		    return "";
		}
	    })
	    .style("font-weight", "normal")
	    .transition()
	    .duration(500)
	    .attr("fill", function() {
            return feature.foreground_color();
	    });
    });

    feature.updater(function (genes) {
	var track = this;
	genes
	    .select("rect")
	    .transition()
	    .duration(500)
	    .attr("y", function (d) {
		return (feature.layout().gene_slot().slot_height * d.slot);
	    })
	    .attr("height", feature.layout().gene_slot().gene_height);

	genes
	    .select("text")
	    .transition()
	    .duration(500)
	    .attr("y", function (d) {
		return (feature.layout().gene_slot().slot_height * d.slot) + 25;
	    })
	    .text(function (d) {
                if (feature.layout().gene_slot().show_label) {
		    return d.display_label;
                } else {
		    return "";
                }
	    });
    });

    feature.mover(function (genes, xScale) {
	genes.select("rect")
	    .attr("x", function (d) {
		return xScale(d.start);
	    })
	    .attr("width", function (d) {
		return (xScale(d.end) - xScale(d.start));
	    });

	genes.select("text")
	    .attr("x", function (d) {
            return xScale(d.start);
        });
    });

    return feature;
};

// genome location
 var tnt_feature_location = function () {
     var row;
     var chr;
     var species;
     var text_cbak = function (sp, chr, from, to) {
         return sp + " " + chr + ":" + from + "-" + to;
     };

     var feature = {};
     feature.reset = function () {};
     feature.plot = function () {};
     feature.init = function () { row = undefined; };
     feature.move = function (xScale) {
         var domain = xScale.domain();
         row.select ("text")
            .text(text_cbak(species, chr, ~~domain[0], ~~domain[1]));
     };
     feature.update = function (xScale, where) {
         chr = where.chr;
         species = where.species;
         var track = this;
         var svg_g = track.g;
         var domain = xScale.domain();
         if (row === undefined) {
             row = svg_g;
             row
                 .append("text")
                 .text(text_cbak(species, chr, ~~domain[0], ~~domain[1]));
         }
     };
     feature.text = function (cbak) {
        if (!arguments.length) {
            return text_cbak;
        }
        text_cbak = cbak;
        return this;
     };

     return feature;
 };

var genome_features = {
    gene : tnt_feature_gene,
    sequence : tnt_feature_sequence,
    transcript : tnt_feature_transcript,
    location : tnt_feature_location,
};
module.exports = exports = genome_features;

},{"./layout.js":45,"tnt.api":4,"tnt.board":6}],43:[function(require,module,exports){
var tnt_rest = require("tnt.ensembl");
var apijs = require("tnt.api");
var tnt_board = require("tnt.board");
tnt_board.track.data.genome = require("./data.js");
tnt_board.track.feature.genome = require("./feature");
tnt_board.track.layout.feature = require("./layout");

tnt_board_genome = function() {
    "use strict";

    // Private vars
    var ens_re = /^ENS\w+\d+$/;
    var chr_length;

    // Vars exposed in the API
    var conf = {
        gene           : undefined,
        xref_search    : function () {},
        ensgene_search : function () {},
        context        : 0,
        rest           : tnt_rest()
    };
    tnt_board.track.data.genome.rest = conf.rest;

    var gene;
    var limits = {
        left : 0,
        right : undefined,
        zoom_out : conf.rest.limits.region,
        zoom_in  : 200
    };

    // We "inherit" from board
    var genome_browser = tnt_board();

    // The location and axis track
    var location_track = tnt_board.track()
        .height(20)
        .background_color("white")
        .data(tnt_board.track.data.empty())
        .display(tnt_board.track.feature.genome.location());

    var axis_track = tnt_board.track()
        .height(0)
        .background_color("white")
        .data(tnt_board.track.data.empty())
        .display(tnt_board.track.feature.axis());

    genome_browser
	   .add_track(location_track)
       .add_track(axis_track);

    // Default location:
    genome_browser
	   .species("human")
       .chr(7)
       .from(139424940)
       .to(141784100);

    // We save the start method of the 'parent' object
    genome_browser._start = genome_browser.start;

    // We hijack parent's start method
    var start = function (where) {
        if (where !== undefined) {
            if (where.gene !== undefined) {
                get_gene(where);
                return;
            } else {
                if (where.species === undefined) {
                    where.species = genome_browser.species();
                } else {
                    genome_browser.species(where.species);
                }
                if (where.chr === undefined) {
                    where.chr = genome_browser.chr();
                } else {
                    genome_browser.chr(where.chr);
                }
                if (where.from === undefined) {
                    where.from = genome_browser.from();
                } else {
                    genome_browser.from(where.from);
                }
                if (where.to === undefined) {
                    where.to = genome_browser.to();
                } else {
                    genome_browser.to(where.to);
                }
            }
        } else { // "where" is undef so look for gene or loc
        if (genome_browser.gene() !== undefined) {
            get_gene({ species : genome_browser.species(),
                gene    : genome_browser.gene()
            });
            return;
        } else {
            where = {};
            where.species = genome_browser.species();
            where.chr     = genome_browser.chr();
            where.from    = genome_browser.from();
            where.to      = genome_browser.to();
        }
    }

    genome_browser.right (function (done) {
        // Get the chromosome length and use it as the 'right' limit
        genome_browser.zoom_in (limits.zoom_in);
        genome_browser.zoom_out (limits.zoom_out);

        var url = conf.rest.url.chr_info ({
            species : where.species,
            chr     : where.chr
        });

        conf.rest.call (url)
            .then( function (resp) {
                done(resp.body.length);
            });
        });
        genome_browser._start();
    };

    var homologues = function (ensGene, callback)  {
        var url = conf.rest.url.homologues ({id : ensGene});
        conf.rest.call(url)
            .then (function(resp) {
                var homologues = resp.body.data[0].homologies;
                if (callback !== undefined) {
                    var homologues_obj = split_homologues(homologues);
                    callback(homologues_obj);
                }
        });
    };

    var isEnsemblGene = function(term) {
        if (term.match(ens_re)) {
            return true;
        } else {
            return false;
        }
    };

    var get_gene = function (where) {
        if (isEnsemblGene(where.gene)) {
            get_ensGene(where.gene);
        } else {
            var url = conf.rest.url.xref ({
                species : where.species,
                name    : where.gene
            });
            conf.rest.call(url)
                .then (function(resp) {
                    var data = resp.body;
                    data = data.filter(function(d) {
                        return !d.id.indexOf("ENS");
                    });
                    if (data[0] !== undefined) {
//                        conf.xref_search(resp);
                        get_ensGene(data[0].id);
                    }
                    conf.xref_search(resp, where.gene, where.species);

                    // else {
                      // genome_browser.start();
                      // }
                });
        }
    };

    var get_ensGene = function (id) {
        var url = conf.rest.url.gene ({id : id})
        conf.rest.call(url)
            .then (function(resp) {
                var data = resp.body;
                conf.ensgene_search(data);
                var extra = ~~((data.end - data.start) * (conf.context/100));
                genome_browser
                    .species(data.species)
                    .chr(data.seq_region_name)
                    .from(data.start - extra)
                    .to(data.end + extra);

                genome_browser.start( { species : data.species,
                    chr     : data.seq_region_name,
                    from    : data.start - extra,
                    to      : data.end + extra
                } );
            });
    };

    var split_homologues = function (homologues) {
        var orthoPatt = /ortholog/;
        var paraPatt = /paralog/;

        var orthologues = homologues.filter(function(d){return d.type.match(orthoPatt)});
        var paralogues  = homologues.filter(function(d){return d.type.match(paraPatt)});

        return {
            'orthologues' : orthologues,
            'paralogues'  : paralogues
        };
    };

    var api = apijs(genome_browser)
        .getset (conf)
        .method("zoom_in", function (v) {
            if (!arguments.length) {
                return limits.zoom_in;
            }
            limits.zoom_in = v;
            return this;
        });

    api.method ({
        start      : start,
        homologues : homologues
    });

    return genome_browser;
};

module.exports = exports = tnt_board_genome;

},{"./data.js":41,"./feature":42,"./layout":45,"tnt.api":4,"tnt.board":6,"tnt.ensembl":19}],44:[function(require,module,exports){
var board = require("tnt.board");
board.genome = require("./genome");

module.exports = exports = board;

},{"./genome":43,"tnt.board":6}],45:[function(require,module,exports){
var apijs = require ("tnt.api");

// The overlap detector used for genes
var gene_layout = function() {
    // Private vars
    var max_slots;

    // vars exposed in the API:
    var height = 150;
    // var conf = {
    //     height   : 150,
    //     scale    : undefined
    // };

    var old_elements = [];

    var scale;

    var slot_types = {
        'expanded'   : {
            slot_height : 30,
            gene_height : 10,
            show_label  : true
        },
        'collapsed' : {
            slot_height : 10,
            gene_height : 7,
            show_label  : false
        }
    };
    var current_slot_type = 'expanded';

    // The returned closure / object
    var genes_layout = function (new_genes, xScale) {
        var track = this;
        scale = xScale;

        // We make sure that the genes have name
        for (var i = 0; i < new_genes.length; i++) {
            if (new_genes[i].external_name === null) {
                new_genes[i].external_name = "";
            }
        }

        max_slots = ~~(track.height() / slot_types.expanded.slot_height);

        // if (scale !== undefined) {
        //     genes_layout.scale(scale);
        // }

        slot_keeper(new_genes, old_elements);
        var needed_slots = collition_detector(new_genes);
        slot_types.collapsed.needed_slots = needed_slots;
        slot_types.expanded.needed_slots = needed_slots;
        if (genes_layout.fixed_slot_type()) {
            current_slot_type = genes_layout.fixed_slot_type();
        }
        else if (needed_slots > max_slots) {
            current_slot_type = 'collapsed';
        } else {
            current_slot_type = 'expanded';
        }

        // run the user-defined callback
        genes_layout.on_layout_run()(slot_types, current_slot_type);

        //conf_ro.elements = new_genes;
        old_elements = new_genes;
        return new_genes;
    };

    var gene_slot = function () {
        return slot_types[current_slot_type];
    };

    var collition_detector = function (genes) {
        var genes_placed = [];
        var genes_to_place = genes;
        var needed_slots = 0;
        for (var i = 0; i < genes.length; i++) {
            if (genes[i].slot > needed_slots && genes[i].slot < max_slots) {
                needed_slots = genes[i].slot;
            }
        }

        for (var i=0; i<genes_to_place.length; i++) {
            var genes_by_slot = sort_genes_by_slot(genes_placed);
            var this_gene = genes_to_place[i];
            if (this_gene.slot !== undefined && this_gene.slot < max_slots) {
                if (slot_has_space(this_gene, genes_by_slot[this_gene.slot])) {
                    genes_placed.push(this_gene);
                    continue;
                }
            }
            var slot = 0;
            OUTER: while (true) {
                if (slot_has_space(this_gene, genes_by_slot[slot])) {
                    this_gene.slot = slot;
                    genes_placed.push(this_gene);
                    if (slot > needed_slots) {
                        needed_slots = slot;
                    }
                    break;
                }
                slot++;
            }
        }
        return needed_slots + 1;
    };

    var slot_has_space = function (query_gene, genes_in_this_slot) {
        if (genes_in_this_slot === undefined) {
            return true;
        }
        for (var j = 0; j < genes_in_this_slot.length; j++) {
            var subj_gene = genes_in_this_slot[j];
            if (query_gene.id === subj_gene.id) {
                continue;
            }
            var y_label_end = subj_gene.display_label.length * 8 + scale(subj_gene.start); // TODO: It may be better to have a fixed font size (instead of the hardcoded value)?
            var y1  = scale(subj_gene.start);
            var y2  = scale(subj_gene.end) > y_label_end ? scale(subj_gene.end) : y_label_end;
            var x_label_end = query_gene.display_label.length * 8 + scale(query_gene.start);
            var x1 = scale(query_gene.start);
            var x2 = scale(query_gene.end) > x_label_end ? scale(query_gene.end) : x_label_end;
            if ( ((x1 <= y1) && (x2 >= y1)) ||
            ((x1 >= y1) && (x1 <= y2)) ) {
                return false;
            }
        }
        return true;
    };

    var slot_keeper = function (genes, prev_genes) {
        var prev_genes_slots = genes2slots(prev_genes);

        for (var i = 0; i < genes.length; i++) {
            if (prev_genes_slots[genes[i].id] !== undefined) {
                genes[i].slot = prev_genes_slots[genes[i].id];
            }
        }
    };

    var genes2slots = function (genes_array) {
        var hash = {};
        for (var i = 0; i < genes_array.length; i++) {
            var gene = genes_array[i];
            hash[gene.id] = gene.slot;
        }
        return hash;
    };

    var sort_genes_by_slot = function (genes) {
        var slots = [];
        for (var i = 0; i < genes.length; i++) {
            if (slots[genes[i].slot] === undefined) {
                slots[genes[i].slot] = [];
            }
            slots[genes[i].slot].push(genes[i]);
        }
        return slots;
    };

    // API
    var api = apijs (genes_layout)
//    .getset (conf)
//    .get (conf_ro)
        .getset ("elements", function () {})
        .getset ("on_layout_run", function () {})
        .getset ("fixed_slot_type")
        .method ({
            gene_slot : gene_slot,
            // height : function () {
            //     return slot_types.expanded.needed_slots * slot_types.expanded.slot_height;
            // }
        });

    // Check that the fixed slot type is valid
    genes_layout.fixed_slot_type.check(function (val) {
            return ((val === "collapsed") || (val === "expanded"));
    });

    return genes_layout;
};

module.exports = exports = gene_layout;

},{"tnt.api":4}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL2Zha2VfZDZlZDY1MGQuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQuYXBpL2luZGV4LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5hcGkvc3JjL2FwaS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQuYm9hcmQvaW5kZXguanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmJvYXJkL25vZGVfbW9kdWxlcy90bnQudXRpbHMvaW5kZXguanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmJvYXJkL25vZGVfbW9kdWxlcy90bnQudXRpbHMvc3JjL2luZGV4LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5ib2FyZC9ub2RlX21vZHVsZXMvdG50LnV0aWxzL3NyYy9yZWR1Y2UuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmJvYXJkL25vZGVfbW9kdWxlcy90bnQudXRpbHMvc3JjL3V0aWxzLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5ib2FyZC9zcmMvYm9hcmQuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmJvYXJkL3NyYy9kYXRhLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5ib2FyZC9zcmMvZmVhdHVyZS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQuYm9hcmQvc3JjL2luZGV4LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5ib2FyZC9zcmMvbGF5b3V0LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5ib2FyZC9zcmMvdHJhY2suanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmVuc2VtYmwvaW5kZXguanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmVuc2VtYmwvbm9kZV9tb2R1bGVzL2VzNi1wcm9taXNlL2Rpc3QvZXM2LXByb21pc2UuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmVuc2VtYmwvbm9kZV9tb2R1bGVzL2h0dHBwbGVhc2UtcHJvbWlzZXMvaHR0cHBsZWFzZS1wcm9taXNlcy5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQuZW5zZW1ibC9ub2RlX21vZHVsZXMvaHR0cHBsZWFzZS9saWIvZXJyb3IuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmVuc2VtYmwvbm9kZV9tb2R1bGVzL2h0dHBwbGVhc2UvbGliL2luZGV4LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5lbnNlbWJsL25vZGVfbW9kdWxlcy9odHRwcGxlYXNlL2xpYi9yZXF1ZXN0LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5lbnNlbWJsL25vZGVfbW9kdWxlcy9odHRwcGxlYXNlL2xpYi9yZXNwb25zZS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQuZW5zZW1ibC9ub2RlX21vZHVsZXMvaHR0cHBsZWFzZS9saWIvdXRpbHMvZGVsYXkuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmVuc2VtYmwvbm9kZV9tb2R1bGVzL2h0dHBwbGVhc2UvbGliL3V0aWxzL29uY2UuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9ub2RlX21vZHVsZXMvdG50LmVuc2VtYmwvbm9kZV9tb2R1bGVzL2h0dHBwbGVhc2UvbGliL3hoci1icm93c2VyLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5lbnNlbWJsL25vZGVfbW9kdWxlcy9odHRwcGxlYXNlL25vZGVfbW9kdWxlcy94dGVuZC9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQuZW5zZW1ibC9ub2RlX21vZHVsZXMvaHR0cHBsZWFzZS9wbHVnaW5zL2NsZWFudXJsLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5lbnNlbWJsL25vZGVfbW9kdWxlcy9odHRwcGxlYXNlL3BsdWdpbnMvanNvbi5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQuZW5zZW1ibC9ub2RlX21vZHVsZXMvaHR0cHBsZWFzZS9wbHVnaW5zL2pzb25yZXF1ZXN0LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5lbnNlbWJsL25vZGVfbW9kdWxlcy9odHRwcGxlYXNlL3BsdWdpbnMvanNvbnJlc3BvbnNlLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC5lbnNlbWJsL3NyYy9yZXN0LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC50b29sdGlwL2luZGV4LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC50b29sdGlwL3NyYy90b29sdGlwLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC51dGlscy9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL25vZGVfbW9kdWxlcy90bnQudXRpbHMvc3JjL2luZGV4LmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvbm9kZV9tb2R1bGVzL3RudC51dGlscy9zcmMvdXRpbHMuanMiLCIvVXNlcnMvcGlnbmF0ZWxsaS9zcmMvcmVwb3MvdG50Lmdlbm9tZS9zcmMvZGF0YS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL3NyYy9mZWF0dXJlLmpzIiwiL1VzZXJzL3BpZ25hdGVsbGkvc3JjL3JlcG9zL3RudC5nZW5vbWUvc3JjL2dlbm9tZS5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL3NyYy9pbmRleC5qcyIsIi9Vc2Vycy9waWduYXRlbGxpL3NyYy9yZXBvcy90bnQuZ2Vub21lL3NyYy9sYXlvdXQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7QUNSQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3R5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5OEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxUUE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxUkE7O0FDQUE7Ozs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiaWYgKHR5cGVvZiB0bnQgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHRudCA9IHt9O1xufVxudG50LmJvYXJkID0gcmVxdWlyZShcIi4vaW5kZXguanNcIik7XG50bnQudXRpbHMgPSByZXF1aXJlKFwidG50LnV0aWxzXCIpO1xudG50LnRvb2x0aXAgPSByZXF1aXJlKFwidG50LnRvb2x0aXBcIik7XG4iLCIvLyBpZiAodHlwZW9mIHRudCA9PT0gXCJ1bmRlZmluZWRcIikge1xuLy8gICAgIG1vZHVsZS5leHBvcnRzID0gdG50ID0ge31cbi8vIH1cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vc3JjL2luZGV4LmpzXCIpO1xuXG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vc3JjL2FwaS5qc1wiKTtcbiIsInZhciBhcGkgPSBmdW5jdGlvbiAod2hvKSB7XG5cbiAgICB2YXIgX21ldGhvZHMgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBtID0gW107XG5cblx0bS5hZGRfYmF0Y2ggPSBmdW5jdGlvbiAob2JqKSB7XG5cdCAgICBtLnVuc2hpZnQob2JqKTtcblx0fTtcblxuXHRtLnVwZGF0ZSA9IGZ1bmN0aW9uIChtZXRob2QsIHZhbHVlKSB7XG5cdCAgICBmb3IgKHZhciBpPTA7IGk8bS5sZW5ndGg7IGkrKykge1xuXHRcdGZvciAodmFyIHAgaW4gbVtpXSkge1xuXHRcdCAgICBpZiAocCA9PT0gbWV0aG9kKSB7XG5cdFx0XHRtW2ldW3BdID0gdmFsdWU7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHQgICAgfVxuXHRcdH1cblx0ICAgIH1cblx0ICAgIHJldHVybiBmYWxzZTtcblx0fTtcblxuXHRtLmFkZCA9IGZ1bmN0aW9uIChtZXRob2QsIHZhbHVlKSB7XG5cdCAgICBpZiAobS51cGRhdGUgKG1ldGhvZCwgdmFsdWUpICkge1xuXHQgICAgfSBlbHNlIHtcblx0XHR2YXIgcmVnID0ge307XG5cdFx0cmVnW21ldGhvZF0gPSB2YWx1ZTtcblx0XHRtLmFkZF9iYXRjaCAocmVnKTtcblx0ICAgIH1cblx0fTtcblxuXHRtLmdldCA9IGZ1bmN0aW9uIChtZXRob2QpIHtcblx0ICAgIGZvciAodmFyIGk9MDsgaTxtLmxlbmd0aDsgaSsrKSB7XG5cdFx0Zm9yICh2YXIgcCBpbiBtW2ldKSB7XG5cdFx0ICAgIGlmIChwID09PSBtZXRob2QpIHtcblx0XHRcdHJldHVybiBtW2ldW3BdO1xuXHRcdCAgICB9XG5cdFx0fVxuXHQgICAgfVxuXHR9O1xuXG5cdHJldHVybiBtO1xuICAgIH07XG5cbiAgICB2YXIgbWV0aG9kcyAgICA9IF9tZXRob2RzKCk7XG4gICAgdmFyIGFwaSA9IGZ1bmN0aW9uICgpIHt9O1xuXG4gICAgYXBpLmNoZWNrID0gZnVuY3Rpb24gKG1ldGhvZCwgY2hlY2ssIG1zZykge1xuXHRpZiAobWV0aG9kIGluc3RhbmNlb2YgQXJyYXkpIHtcblx0ICAgIGZvciAodmFyIGk9MDsgaTxtZXRob2QubGVuZ3RoOyBpKyspIHtcblx0XHRhcGkuY2hlY2sobWV0aG9kW2ldLCBjaGVjaywgbXNnKTtcblx0ICAgIH1cblx0ICAgIHJldHVybjtcblx0fVxuXG5cdGlmICh0eXBlb2YgKG1ldGhvZCkgPT09ICdmdW5jdGlvbicpIHtcblx0ICAgIG1ldGhvZC5jaGVjayhjaGVjaywgbXNnKTtcblx0fSBlbHNlIHtcblx0ICAgIHdob1ttZXRob2RdLmNoZWNrKGNoZWNrLCBtc2cpO1xuXHR9XG5cdHJldHVybiBhcGk7XG4gICAgfTtcblxuICAgIGFwaS50cmFuc2Zvcm0gPSBmdW5jdGlvbiAobWV0aG9kLCBjYmFrKSB7XG5cdGlmIChtZXRob2QgaW5zdGFuY2VvZiBBcnJheSkge1xuXHQgICAgZm9yICh2YXIgaT0wOyBpPG1ldGhvZC5sZW5ndGg7IGkrKykge1xuXHRcdGFwaS50cmFuc2Zvcm0gKG1ldGhvZFtpXSwgY2Jhayk7XG5cdCAgICB9XG5cdCAgICByZXR1cm47XG5cdH1cblxuXHRpZiAodHlwZW9mIChtZXRob2QpID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICBtZXRob2QudHJhbnNmb3JtIChjYmFrKTtcblx0fSBlbHNlIHtcblx0ICAgIHdob1ttZXRob2RdLnRyYW5zZm9ybShjYmFrKTtcblx0fVxuXHRyZXR1cm4gYXBpO1xuICAgIH07XG5cbiAgICB2YXIgYXR0YWNoX21ldGhvZCA9IGZ1bmN0aW9uIChtZXRob2QsIG9wdHMpIHtcblx0dmFyIGNoZWNrcyA9IFtdO1xuXHR2YXIgdHJhbnNmb3JtcyA9IFtdO1xuXG5cdHZhciBnZXR0ZXIgPSBvcHRzLm9uX2dldHRlciB8fCBmdW5jdGlvbiAoKSB7XG5cdCAgICByZXR1cm4gbWV0aG9kcy5nZXQobWV0aG9kKTtcblx0fTtcblxuXHR2YXIgc2V0dGVyID0gb3B0cy5vbl9zZXR0ZXIgfHwgZnVuY3Rpb24gKHgpIHtcblx0ICAgIGZvciAodmFyIGk9MDsgaTx0cmFuc2Zvcm1zLmxlbmd0aDsgaSsrKSB7XG5cdFx0eCA9IHRyYW5zZm9ybXNbaV0oeCk7XG5cdCAgICB9XG5cblx0ICAgIGZvciAodmFyIGo9MDsgajxjaGVja3MubGVuZ3RoOyBqKyspIHtcblx0XHRpZiAoIWNoZWNrc1tqXS5jaGVjayh4KSkge1xuXHRcdCAgICB2YXIgbXNnID0gY2hlY2tzW2pdLm1zZyB8fCBcblx0XHRcdChcIlZhbHVlIFwiICsgeCArIFwiIGRvZXNuJ3Qgc2VlbSB0byBiZSB2YWxpZCBmb3IgdGhpcyBtZXRob2RcIik7XG5cdFx0ICAgIHRocm93IChtc2cpO1xuXHRcdH1cblx0ICAgIH1cblx0ICAgIG1ldGhvZHMuYWRkKG1ldGhvZCwgeCk7XG5cdH07XG5cblx0dmFyIG5ld19tZXRob2QgPSBmdW5jdGlvbiAobmV3X3ZhbCkge1xuXHQgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIGdldHRlcigpO1xuXHQgICAgfVxuXHQgICAgc2V0dGVyKG5ld192YWwpO1xuXHQgICAgcmV0dXJuIHdobzsgLy8gUmV0dXJuIHRoaXM/XG5cdH07XG5cdG5ld19tZXRob2QuY2hlY2sgPSBmdW5jdGlvbiAoY2JhaywgbXNnKSB7XG5cdCAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0XHRyZXR1cm4gY2hlY2tzO1xuXHQgICAgfVxuXHQgICAgY2hlY2tzLnB1c2ggKHtjaGVjayA6IGNiYWssXG5cdFx0XHQgIG1zZyAgIDogbXNnfSk7XG5cdCAgICByZXR1cm4gdGhpcztcblx0fTtcblx0bmV3X21ldGhvZC50cmFuc2Zvcm0gPSBmdW5jdGlvbiAoY2Jhaykge1xuXHQgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIHRyYW5zZm9ybXM7XG5cdCAgICB9XG5cdCAgICB0cmFuc2Zvcm1zLnB1c2goY2Jhayk7XG5cdCAgICByZXR1cm4gdGhpcztcblx0fTtcblxuXHR3aG9bbWV0aG9kXSA9IG5ld19tZXRob2Q7XG4gICAgfTtcblxuICAgIHZhciBnZXRzZXQgPSBmdW5jdGlvbiAocGFyYW0sIG9wdHMpIHtcblx0aWYgKHR5cGVvZiAocGFyYW0pID09PSAnb2JqZWN0Jykge1xuXHQgICAgbWV0aG9kcy5hZGRfYmF0Y2ggKHBhcmFtKTtcblx0ICAgIGZvciAodmFyIHAgaW4gcGFyYW0pIHtcblx0XHRhdHRhY2hfbWV0aG9kIChwLCBvcHRzKTtcblx0ICAgIH1cblx0fSBlbHNlIHtcblx0ICAgIG1ldGhvZHMuYWRkIChwYXJhbSwgb3B0cy5kZWZhdWx0X3ZhbHVlKTtcblx0ICAgIGF0dGFjaF9tZXRob2QgKHBhcmFtLCBvcHRzKTtcblx0fVxuICAgIH07XG5cbiAgICBhcGkuZ2V0c2V0ID0gZnVuY3Rpb24gKHBhcmFtLCBkZWYpIHtcblx0Z2V0c2V0KHBhcmFtLCB7ZGVmYXVsdF92YWx1ZSA6IGRlZn0pO1xuXG5cdHJldHVybiBhcGk7XG4gICAgfTtcblxuICAgIGFwaS5nZXQgPSBmdW5jdGlvbiAocGFyYW0sIGRlZikge1xuXHR2YXIgb25fc2V0dGVyID0gZnVuY3Rpb24gKCkge1xuXHQgICAgdGhyb3cgKFwiTWV0aG9kIGRlZmluZWQgb25seSBhcyBhIGdldHRlciAoeW91IGFyZSB0cnlpbmcgdG8gdXNlIGl0IGFzIGEgc2V0dGVyXCIpO1xuXHR9O1xuXG5cdGdldHNldChwYXJhbSwge2RlZmF1bHRfdmFsdWUgOiBkZWYsXG5cdFx0ICAgICAgIG9uX3NldHRlciA6IG9uX3NldHRlcn1cblx0ICAgICAgKTtcblxuXHRyZXR1cm4gYXBpO1xuICAgIH07XG5cbiAgICBhcGkuc2V0ID0gZnVuY3Rpb24gKHBhcmFtLCBkZWYpIHtcblx0dmFyIG9uX2dldHRlciA9IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRocm93IChcIk1ldGhvZCBkZWZpbmVkIG9ubHkgYXMgYSBzZXR0ZXIgKHlvdSBhcmUgdHJ5aW5nIHRvIHVzZSBpdCBhcyBhIGdldHRlclwiKTtcblx0fTtcblxuXHRnZXRzZXQocGFyYW0sIHtkZWZhdWx0X3ZhbHVlIDogZGVmLFxuXHRcdCAgICAgICBvbl9nZXR0ZXIgOiBvbl9nZXR0ZXJ9XG5cdCAgICAgICk7XG5cblx0cmV0dXJuIGFwaTtcbiAgICB9O1xuXG4gICAgYXBpLm1ldGhvZCA9IGZ1bmN0aW9uIChuYW1lLCBjYmFrKSB7XG5cdGlmICh0eXBlb2YgKG5hbWUpID09PSAnb2JqZWN0Jykge1xuXHQgICAgZm9yICh2YXIgcCBpbiBuYW1lKSB7XG5cdFx0d2hvW3BdID0gbmFtZVtwXTtcblx0ICAgIH1cblx0fSBlbHNlIHtcblx0ICAgIHdob1tuYW1lXSA9IGNiYWs7XG5cdH1cblx0cmV0dXJuIGFwaTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGFwaTtcbiAgICBcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IGFwaTsiLCIvLyBpZiAodHlwZW9mIHRudCA9PT0gXCJ1bmRlZmluZWRcIikge1xuLy8gICAgIG1vZHVsZS5leHBvcnRzID0gdG50ID0ge31cbi8vIH1cbi8vIHRudC51dGlscyA9IHJlcXVpcmUoXCJ0bnQudXRpbHNcIik7XG4vLyB0bnQudG9vbHRpcCA9IHJlcXVpcmUoXCJ0bnQudG9vbHRpcFwiKTtcbi8vIHRudC5ib2FyZCA9IHJlcXVpcmUoXCIuL3NyYy9pbmRleC5qc1wiKTtcblxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9zcmMvaW5kZXhcIik7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL3NyYy9pbmRleC5qc1wiKTtcbiIsIi8vIHJlcXVpcmUoJ2ZzJykucmVhZGRpclN5bmMoX19kaXJuYW1lICsgJy8nKS5mb3JFYWNoKGZ1bmN0aW9uKGZpbGUpIHtcbi8vICAgICBpZiAoZmlsZS5tYXRjaCgvLitcXC5qcy9nKSAhPT0gbnVsbCAmJiBmaWxlICE9PSBfX2ZpbGVuYW1lKSB7XG4vLyBcdHZhciBuYW1lID0gZmlsZS5yZXBsYWNlKCcuanMnLCAnJyk7XG4vLyBcdG1vZHVsZS5leHBvcnRzW25hbWVdID0gcmVxdWlyZSgnLi8nICsgZmlsZSk7XG4vLyAgICAgfVxuLy8gfSk7XG5cbi8vIFNhbWUgYXNcbnZhciB1dGlscyA9IHJlcXVpcmUoXCIuL3V0aWxzLmpzXCIpO1xudXRpbHMucmVkdWNlID0gcmVxdWlyZShcIi4vcmVkdWNlLmpzXCIpO1xubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gdXRpbHM7XG4iLCJ2YXIgcmVkdWNlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzbW9vdGggPSA1O1xuICAgIHZhciB2YWx1ZSA9ICd2YWwnO1xuICAgIHZhciByZWR1bmRhbnQgPSBmdW5jdGlvbiAoYSwgYikge1xuXHRpZiAoYSA8IGIpIHtcblx0ICAgIHJldHVybiAoKGItYSkgPD0gKGIgKiAwLjIpKTtcblx0fVxuXHRyZXR1cm4gKChhLWIpIDw9IChhICogMC4yKSk7XG4gICAgfTtcbiAgICB2YXIgcGVyZm9ybV9yZWR1Y2UgPSBmdW5jdGlvbiAoYXJyKSB7cmV0dXJuIGFycjt9O1xuXG4gICAgdmFyIHJlZHVjZSA9IGZ1bmN0aW9uIChhcnIpIHtcblx0aWYgKCFhcnIubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gYXJyO1xuXHR9XG5cdHZhciBzbW9vdGhlZCA9IHBlcmZvcm1fc21vb3RoKGFycik7XG5cdHZhciByZWR1Y2VkICA9IHBlcmZvcm1fcmVkdWNlKHNtb290aGVkKTtcblx0cmV0dXJuIHJlZHVjZWQ7XG4gICAgfTtcblxuICAgIHZhciBtZWRpYW4gPSBmdW5jdGlvbiAodiwgYXJyKSB7XG5cdGFyci5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG5cdCAgICByZXR1cm4gYVt2YWx1ZV0gLSBiW3ZhbHVlXTtcblx0fSk7XG5cdGlmIChhcnIubGVuZ3RoICUgMikge1xuXHQgICAgdlt2YWx1ZV0gPSBhcnJbfn4oYXJyLmxlbmd0aCAvIDIpXVt2YWx1ZV07XHQgICAgXG5cdH0gZWxzZSB7XG5cdCAgICB2YXIgbiA9IH5+KGFyci5sZW5ndGggLyAyKSAtIDE7XG5cdCAgICB2W3ZhbHVlXSA9IChhcnJbbl1bdmFsdWVdICsgYXJyW24rMV1bdmFsdWVdKSAvIDI7XG5cdH1cblxuXHRyZXR1cm4gdjtcbiAgICB9O1xuXG4gICAgdmFyIGNsb25lID0gZnVuY3Rpb24gKHNvdXJjZSkge1xuXHR2YXIgdGFyZ2V0ID0ge307XG5cdGZvciAodmFyIHByb3AgaW4gc291cmNlKSB7XG5cdCAgICBpZiAoc291cmNlLmhhc093blByb3BlcnR5KHByb3ApKSB7XG5cdFx0dGFyZ2V0W3Byb3BdID0gc291cmNlW3Byb3BdO1xuXHQgICAgfVxuXHR9XG5cdHJldHVybiB0YXJnZXQ7XG4gICAgfTtcblxuICAgIHZhciBwZXJmb3JtX3Ntb290aCA9IGZ1bmN0aW9uIChhcnIpIHtcblx0aWYgKHNtb290aCA9PT0gMCkgeyAvLyBubyBzbW9vdGhcblx0ICAgIHJldHVybiBhcnI7XG5cdH1cblx0dmFyIHNtb290aF9hcnIgPSBbXTtcblx0Zm9yICh2YXIgaT0wOyBpPGFyci5sZW5ndGg7IGkrKykge1xuXHQgICAgdmFyIGxvdyA9IChpIDwgc21vb3RoKSA/IDAgOiAoaSAtIHNtb290aCk7XG5cdCAgICB2YXIgaGlnaCA9IChpID4gKGFyci5sZW5ndGggLSBzbW9vdGgpKSA/IGFyci5sZW5ndGggOiAoaSArIHNtb290aCk7XG5cdCAgICBzbW9vdGhfYXJyW2ldID0gbWVkaWFuKGNsb25lKGFycltpXSksIGFyci5zbGljZShsb3csaGlnaCsxKSk7XG5cdH1cblx0cmV0dXJuIHNtb290aF9hcnI7XG4gICAgfTtcblxuICAgIHJlZHVjZS5yZWR1Y2VyID0gZnVuY3Rpb24gKGNiYWspIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gcGVyZm9ybV9yZWR1Y2U7XG5cdH1cblx0cGVyZm9ybV9yZWR1Y2UgPSBjYmFrO1xuXHRyZXR1cm4gcmVkdWNlO1xuICAgIH07XG5cbiAgICByZWR1Y2UucmVkdW5kYW50ID0gZnVuY3Rpb24gKGNiYWspIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gcmVkdW5kYW50O1xuXHR9XG5cdHJlZHVuZGFudCA9IGNiYWs7XG5cdHJldHVybiByZWR1Y2U7XG4gICAgfTtcblxuICAgIHJlZHVjZS52YWx1ZSA9IGZ1bmN0aW9uICh2YWwpIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gdmFsdWU7XG5cdH1cblx0dmFsdWUgPSB2YWw7XG5cdHJldHVybiByZWR1Y2U7XG4gICAgfTtcblxuICAgIHJlZHVjZS5zbW9vdGggPSBmdW5jdGlvbiAodmFsKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIHNtb290aDtcblx0fVxuXHRzbW9vdGggPSB2YWw7XG5cdHJldHVybiByZWR1Y2U7XG4gICAgfTtcblxuICAgIHJldHVybiByZWR1Y2U7XG59O1xuXG52YXIgYmxvY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJlZCA9IHJlZHVjZSgpXG5cdC52YWx1ZSgnc3RhcnQnKTtcblxuICAgIHZhciB2YWx1ZTIgPSAnZW5kJztcblxuICAgIHZhciBqb2luID0gZnVuY3Rpb24gKG9iajEsIG9iajIpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICdvYmplY3QnIDoge1xuICAgICAgICAgICAgICAgICdzdGFydCcgOiBvYmoxLm9iamVjdFtyZWQudmFsdWUoKV0sXG4gICAgICAgICAgICAgICAgJ2VuZCcgICA6IG9iajJbdmFsdWUyXVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICd2YWx1ZScgIDogb2JqMlt2YWx1ZTJdXG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIC8vIHZhciBqb2luID0gZnVuY3Rpb24gKG9iajEsIG9iajIpIHsgcmV0dXJuIG9iajEgfTtcblxuICAgIHJlZC5yZWR1Y2VyKCBmdW5jdGlvbiAoYXJyKSB7XG5cdHZhciB2YWx1ZSA9IHJlZC52YWx1ZSgpO1xuXHR2YXIgcmVkdW5kYW50ID0gcmVkLnJlZHVuZGFudCgpO1xuXHR2YXIgcmVkdWNlZF9hcnIgPSBbXTtcblx0dmFyIGN1cnIgPSB7XG5cdCAgICAnb2JqZWN0JyA6IGFyclswXSxcblx0ICAgICd2YWx1ZScgIDogYXJyWzBdW3ZhbHVlMl1cblx0fTtcblx0Zm9yICh2YXIgaT0xOyBpPGFyci5sZW5ndGg7IGkrKykge1xuXHQgICAgaWYgKHJlZHVuZGFudCAoYXJyW2ldW3ZhbHVlXSwgY3Vyci52YWx1ZSkpIHtcblx0XHRjdXJyID0gam9pbihjdXJyLCBhcnJbaV0pO1xuXHRcdGNvbnRpbnVlO1xuXHQgICAgfVxuXHQgICAgcmVkdWNlZF9hcnIucHVzaCAoY3Vyci5vYmplY3QpO1xuXHQgICAgY3Vyci5vYmplY3QgPSBhcnJbaV07XG5cdCAgICBjdXJyLnZhbHVlID0gYXJyW2ldLmVuZDtcblx0fVxuXHRyZWR1Y2VkX2Fyci5wdXNoKGN1cnIub2JqZWN0KTtcblxuXHQvLyByZWR1Y2VkX2Fyci5wdXNoKGFyclthcnIubGVuZ3RoLTFdKTtcblx0cmV0dXJuIHJlZHVjZWRfYXJyO1xuICAgIH0pO1xuXG4gICAgcmVkdWNlLmpvaW4gPSBmdW5jdGlvbiAoY2Jhaykge1xuXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0ICAgIHJldHVybiBqb2luO1xuXHR9XG5cdGpvaW4gPSBjYmFrO1xuXHRyZXR1cm4gcmVkO1xuICAgIH07XG5cbiAgICByZWR1Y2UudmFsdWUyID0gZnVuY3Rpb24gKGZpZWxkKSB7XG5cdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHQgICAgcmV0dXJuIHZhbHVlMjtcblx0fVxuXHR2YWx1ZTIgPSBmaWVsZDtcblx0cmV0dXJuIHJlZDtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHJlZDtcbn07XG5cbnZhciBsaW5lID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciByZWQgPSByZWR1Y2UoKTtcblxuICAgIHJlZC5yZWR1Y2VyICggZnVuY3Rpb24gKGFycikge1xuXHR2YXIgcmVkdW5kYW50ID0gcmVkLnJlZHVuZGFudCgpO1xuXHR2YXIgdmFsdWUgPSByZWQudmFsdWUoKTtcblx0dmFyIHJlZHVjZWRfYXJyID0gW107XG5cdHZhciBjdXJyID0gYXJyWzBdO1xuXHRmb3IgKHZhciBpPTE7IGk8YXJyLmxlbmd0aC0xOyBpKyspIHtcblx0ICAgIGlmIChyZWR1bmRhbnQgKGFycltpXVt2YWx1ZV0sIGN1cnJbdmFsdWVdKSkge1xuXHRcdGNvbnRpbnVlO1xuXHQgICAgfVxuXHQgICAgcmVkdWNlZF9hcnIucHVzaCAoY3Vycik7XG5cdCAgICBjdXJyID0gYXJyW2ldO1xuXHR9XG5cdHJlZHVjZWRfYXJyLnB1c2goY3Vycik7XG5cdHJlZHVjZWRfYXJyLnB1c2goYXJyW2Fyci5sZW5ndGgtMV0pO1xuXHRyZXR1cm4gcmVkdWNlZF9hcnI7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVkO1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlZHVjZTtcbm1vZHVsZS5leHBvcnRzLmxpbmUgPSBsaW5lO1xubW9kdWxlLmV4cG9ydHMuYmxvY2sgPSBibG9jaztcblxuIiwiXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBpdGVyYXRvciA6IGZ1bmN0aW9uKGluaXRfdmFsKSB7XG5cdHZhciBpID0gaW5pdF92YWwgfHwgMDtcblx0dmFyIGl0ZXIgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICByZXR1cm4gaSsrO1xuXHR9O1xuXHRyZXR1cm4gaXRlcjtcbiAgICB9LFxuXG4gICAgc2NyaXB0X3BhdGggOiBmdW5jdGlvbiAoc2NyaXB0X25hbWUpIHsgLy8gc2NyaXB0X25hbWUgaXMgdGhlIGZpbGVuYW1lXG5cdHZhciBzY3JpcHRfc2NhcGVkID0gc2NyaXB0X25hbWUucmVwbGFjZSgvWy1cXC9cXFxcXiQqKz8uKCl8W1xcXXt9XS9nLCAnXFxcXCQmJyk7XG5cdHZhciBzY3JpcHRfcmUgPSBuZXcgUmVnRXhwKHNjcmlwdF9zY2FwZWQgKyAnJCcpO1xuXHR2YXIgc2NyaXB0X3JlX3N1YiA9IG5ldyBSZWdFeHAoJyguKiknICsgc2NyaXB0X3NjYXBlZCArICckJyk7XG5cblx0Ly8gVE9ETzogVGhpcyByZXF1aXJlcyBwaGFudG9tLmpzIG9yIGEgc2ltaWxhciBoZWFkbGVzcyB3ZWJraXQgdG8gd29yayAoZG9jdW1lbnQpXG5cdHZhciBzY3JpcHRzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3NjcmlwdCcpO1xuXHR2YXIgcGF0aCA9IFwiXCI7ICAvLyBEZWZhdWx0IHRvIGN1cnJlbnQgcGF0aFxuXHRpZihzY3JpcHRzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGZvcih2YXIgaSBpbiBzY3JpcHRzKSB7XG5cdFx0aWYoc2NyaXB0c1tpXS5zcmMgJiYgc2NyaXB0c1tpXS5zcmMubWF0Y2goc2NyaXB0X3JlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2NyaXB0c1tpXS5zcmMucmVwbGFjZShzY3JpcHRfcmVfc3ViLCAnJDEnKTtcblx0XHR9XG4gICAgICAgICAgICB9XG5cdH1cblx0cmV0dXJuIHBhdGg7XG4gICAgfSxcblxuICAgIGRlZmVyX2NhbmNlbCA6IGZ1bmN0aW9uIChjYmFrLCB0aW1lKSB7XG5cdHZhciB0aWNrO1xuXG5cdHZhciBkZWZlcl9jYW5jZWwgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICBjbGVhclRpbWVvdXQodGljayk7XG5cdCAgICB0aWNrID0gc2V0VGltZW91dChjYmFrLCB0aW1lKTtcblx0fTtcblxuXHRyZXR1cm4gZGVmZXJfY2FuY2VsO1xuICAgIH1cbn07XG4iLCJ2YXIgYXBpanMgPSByZXF1aXJlIChcInRudC5hcGlcIik7XG52YXIgZGVmZXJDYW5jZWwgPSByZXF1aXJlIChcInRudC51dGlsc1wiKS5kZWZlcl9jYW5jZWw7XG5cbnZhciBib2FyZCA9IGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgLy8vLyBQcml2YXRlIHZhcnNcbiAgICB2YXIgc3ZnO1xuICAgIHZhciBkaXZfaWQ7XG4gICAgdmFyIHRyYWNrcyA9IFtdO1xuICAgIHZhciBtaW5fd2lkdGggPSA1MDtcbiAgICB2YXIgaGVpZ2h0ICAgID0gMDsgICAgLy8gVGhpcyBpcyB0aGUgZ2xvYmFsIGhlaWdodCBpbmNsdWRpbmcgYWxsIHRoZSB0cmFja3NcbiAgICB2YXIgd2lkdGggICAgID0gOTIwO1xuICAgIHZhciBoZWlnaHRfb2Zmc2V0ID0gMjA7XG4gICAgdmFyIGxvYyA9IHtcblx0c3BlY2llcyAgOiB1bmRlZmluZWQsXG5cdGNociAgICAgIDogdW5kZWZpbmVkLFxuICAgICAgICBmcm9tICAgICA6IDAsXG4gICAgICAgIHRvICAgICAgIDogNTAwXG4gICAgfTtcblxuICAgIC8vIFRPRE86IFdlIGhhdmUgbm93IGJhY2tncm91bmQgY29sb3IgaW4gdGhlIHRyYWNrcy4gQ2FuIHRoaXMgYmUgcmVtb3ZlZD9cbiAgICAvLyBJdCBsb29rcyBsaWtlIGl0IGlzIHVzZWQgaW4gdGhlIHRvby13aWRlIHBhbmUgZXRjLCBidXQgaXQgbWF5IG5vdCBiZSBuZWVkZWQgYW55bW9yZVxuICAgIHZhciBiZ0NvbG9yICAgPSBkMy5yZ2IoJyNGOEZCRUYnKTsgLy8jRjhGQkVGXG4gICAgdmFyIHBhbmU7IC8vIERyYWdnYWJsZSBwYW5lXG4gICAgdmFyIHN2Z19nO1xuICAgIHZhciB4U2NhbGU7XG4gICAgdmFyIHpvb21FdmVudEhhbmRsZXIgPSBkMy5iZWhhdmlvci56b29tKCk7XG4gICAgdmFyIGxpbWl0cyA9IHtcbiAgICAgICAgbGVmdCA6IDAsXG4gICAgICAgIHJpZ2h0IDogMTAwMCxcbiAgICAgICAgem9vbV9vdXQgOiAxMDAwLFxuICAgICAgICB6b29tX2luICA6IDEwMFxuICAgIH07XG4gICAgdmFyIGNhcF93aWR0aCA9IDM7XG4gICAgdmFyIGR1ciA9IDUwMDtcbiAgICB2YXIgZHJhZ19hbGxvd2VkID0gdHJ1ZTtcblxuICAgIHZhciBleHBvcnRzID0ge1xuICAgICAgICBlYXNlICAgICAgICAgIDogZDMuZWFzZShcImN1YmljLWluLW91dFwiKSxcbiAgICAgICAgZXh0ZW5kX2NhbnZhcyA6IHtcbiAgICAgICAgICAgIGxlZnQgOiAwLFxuICAgICAgICAgICAgcmlnaHQgOiAwXG4gICAgICAgIH0sXG4gICAgICAgIHNob3dfZnJhbWUgOiB0cnVlXG4gICAgICAgIC8vIGxpbWl0cyAgICAgICAgOiBmdW5jdGlvbiAoKSB7dGhyb3cgXCJUaGUgbGltaXRzIG1ldGhvZCBzaG91bGQgYmUgZGVmaW5lZFwifVxuICAgIH07XG5cbiAgICAvLyBUaGUgcmV0dXJuZWQgY2xvc3VyZSAvIG9iamVjdFxuICAgIHZhciB0cmFja192aXMgPSBmdW5jdGlvbihkaXYpIHtcbiAgICBcdGRpdl9pZCA9IGQzLnNlbGVjdChkaXYpLmF0dHIoXCJpZFwiKTtcblxuICAgIFx0Ly8gVGhlIG9yaWdpbmFsIGRpdiBpcyBjbGFzc2VkIHdpdGggdGhlIHRudCBjbGFzc1xuICAgIFx0ZDMuc2VsZWN0KGRpdilcbiAgICBcdCAgICAuY2xhc3NlZChcInRudFwiLCB0cnVlKTtcblxuICAgIFx0Ly8gVE9ETzogTW92ZSB0aGUgc3R5bGluZyB0byB0aGUgc2Nzcz9cbiAgICBcdHZhciBicm93c2VyRGl2ID0gZDMuc2VsZWN0KGRpdilcbiAgICBcdCAgICAuYXBwZW5kKFwiZGl2XCIpXG4gICAgXHQgICAgLmF0dHIoXCJpZFwiLCBcInRudF9cIiArIGRpdl9pZClcbiAgICBcdCAgICAuc3R5bGUoXCJwb3NpdGlvblwiLCBcInJlbGF0aXZlXCIpXG4gICAgXHQgICAgLmNsYXNzZWQoXCJ0bnRfZnJhbWVkXCIsIGV4cG9ydHMuc2hvd19mcmFtZSA/IHRydWUgOiBmYWxzZSlcbiAgICBcdCAgICAuc3R5bGUoXCJ3aWR0aFwiLCAod2lkdGggKyBjYXBfd2lkdGgqMiArIGV4cG9ydHMuZXh0ZW5kX2NhbnZhcy5yaWdodCArIGV4cG9ydHMuZXh0ZW5kX2NhbnZhcy5sZWZ0KSArIFwicHhcIik7XG5cbiAgICBcdHZhciBncm91cERpdiA9IGJyb3dzZXJEaXZcbiAgICBcdCAgICAuYXBwZW5kKFwiZGl2XCIpXG4gICAgXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF9ncm91cERpdlwiKTtcblxuICAgIFx0Ly8gVGhlIFNWR1xuICAgIFx0c3ZnID0gZ3JvdXBEaXZcbiAgICBcdCAgICAuYXBwZW5kKFwic3ZnXCIpXG4gICAgXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF9zdmdcIilcbiAgICBcdCAgICAuYXR0cihcIndpZHRoXCIsIHdpZHRoKVxuICAgIFx0ICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodClcbiAgICBcdCAgICAuYXR0cihcInBvaW50ZXItZXZlbnRzXCIsIFwiYWxsXCIpO1xuXG4gICAgXHRzdmdfZyA9IHN2Z1xuICAgIFx0ICAgIC5hcHBlbmQoXCJnXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoMCwyMClcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kKFwiZ1wiKVxuICAgIFx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfZ1wiKTtcblxuICAgIFx0Ly8gY2Fwc1xuICAgIFx0c3ZnX2dcbiAgICBcdCAgICAuYXBwZW5kKFwicmVjdFwiKVxuICAgIFx0ICAgIC5hdHRyKFwiaWRcIiwgXCJ0bnRfXCIgKyBkaXZfaWQgKyBcIl81cGNhcFwiKVxuICAgIFx0ICAgIC5hdHRyKFwieFwiLCAwKVxuICAgIFx0ICAgIC5hdHRyKFwieVwiLCAwKVxuICAgIFx0ICAgIC5hdHRyKFwid2lkdGhcIiwgMClcbiAgICBcdCAgICAuYXR0cihcImhlaWdodFwiLCBoZWlnaHQpXG4gICAgXHQgICAgLmF0dHIoXCJmaWxsXCIsIFwicmVkXCIpO1xuICAgIFx0c3ZnX2dcbiAgICBcdCAgICAuYXBwZW5kKFwicmVjdFwiKVxuICAgIFx0ICAgIC5hdHRyKFwiaWRcIiwgXCJ0bnRfXCIgKyBkaXZfaWQgKyBcIl8zcGNhcFwiKVxuICAgIFx0ICAgIC5hdHRyKFwieFwiLCB3aWR0aC1jYXBfd2lkdGgpXG4gICAgXHQgICAgLmF0dHIoXCJ5XCIsIDApXG4gICAgXHQgICAgLmF0dHIoXCJ3aWR0aFwiLCAwKVxuICAgIFx0ICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodClcbiAgICBcdCAgICAuYXR0cihcImZpbGxcIiwgXCJyZWRcIik7XG5cbiAgICBcdC8vIFRoZSBab29taW5nL1Bhbm5pbmcgUGFuZVxuICAgIFx0cGFuZSA9IHN2Z19nXG4gICAgXHQgICAgLmFwcGVuZChcInJlY3RcIilcbiAgICBcdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3BhbmVcIilcbiAgICBcdCAgICAuYXR0cihcImlkXCIsIFwidG50X1wiICsgZGl2X2lkICsgXCJfcGFuZVwiKVxuICAgIFx0ICAgIC5hdHRyKFwid2lkdGhcIiwgd2lkdGgpXG4gICAgXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0KVxuICAgIFx0ICAgIC5zdHlsZShcImZpbGxcIiwgYmdDb2xvcik7XG5cbiAgICBcdC8vICoqIFRPRE86IFdvdWxkbid0IGJlIGJldHRlciB0byBoYXZlIHRoZXNlIG1lc3NhZ2VzIGJ5IHRyYWNrP1xuICAgIFx0Ly8gdmFyIHRvb1dpZGVfdGV4dCA9IHN2Z19nXG4gICAgXHQvLyAgICAgLmFwcGVuZChcInRleHRcIilcbiAgICBcdC8vICAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3dpZGVPS190ZXh0XCIpXG4gICAgXHQvLyAgICAgLmF0dHIoXCJpZFwiLCBcInRudF9cIiArIGRpdl9pZCArIFwiX3Rvb1dpZGVcIilcbiAgICBcdC8vICAgICAuYXR0cihcImZpbGxcIiwgYmdDb2xvcilcbiAgICBcdC8vICAgICAudGV4dChcIlJlZ2lvbiB0b28gd2lkZVwiKTtcblxuICAgIFx0Ly8gVE9ETzogSSBkb24ndCBrbm93IGlmIHRoaXMgaXMgdGhlIGJlc3Qgd2F5IChhbmQgcG9ydGFibGUpIHdheVxuICAgIFx0Ly8gb2YgY2VudGVyaW5nIHRoZSB0ZXh0IGluIHRoZSB0ZXh0IGFyZWFcbiAgICBcdC8vIHZhciBiYiA9IHRvb1dpZGVfdGV4dFswXVswXS5nZXRCQm94KCk7XG4gICAgXHQvLyB0b29XaWRlX3RleHRcbiAgICBcdC8vICAgICAuYXR0cihcInhcIiwgfn4od2lkdGgvMiAtIGJiLndpZHRoLzIpKVxuICAgIFx0Ly8gICAgIC5hdHRyKFwieVwiLCB+fihoZWlnaHQvMiAtIGJiLmhlaWdodC8yKSk7XG4gICAgfTtcblxuICAgIC8vIEFQSVxuICAgIHZhciBhcGkgPSBhcGlqcyAodHJhY2tfdmlzKVxuICAgIFx0LmdldHNldCAoZXhwb3J0cylcbiAgICBcdC5nZXRzZXQgKGxpbWl0cylcbiAgICBcdC5nZXRzZXQgKGxvYyk7XG5cbiAgICBhcGkudHJhbnNmb3JtICh0cmFja192aXMuZXh0ZW5kX2NhbnZhcywgZnVuY3Rpb24gKHZhbCkge1xuICAgIFx0dmFyIHByZXZfdmFsID0gdHJhY2tfdmlzLmV4dGVuZF9jYW52YXMoKTtcbiAgICBcdHZhbC5sZWZ0ID0gdmFsLmxlZnQgfHwgcHJldl92YWwubGVmdDtcbiAgICBcdHZhbC5yaWdodCA9IHZhbC5yaWdodCB8fCBwcmV2X3ZhbC5yaWdodDtcbiAgICBcdHJldHVybiB2YWw7XG4gICAgfSk7XG5cbiAgICAvLyB0cmFja192aXMgYWx3YXlzIHN0YXJ0cyBvbiBsb2MuZnJvbSAmIGxvYy50b1xuICAgIGFwaS5tZXRob2QgKCdzdGFydCcsIGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBSZXNldCB0aGUgdHJhY2tzXG4gICAgICAgIGZvciAodmFyIGk9MDsgaTx0cmFja3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0cmFja3NbaV0uZykge1xuICAgICAgICAgICAgICAgIC8vICAgIHRyYWNrc1tpXS5kaXNwbGF5KCkucmVzZXQuY2FsbCh0cmFja3NbaV0pO1xuICAgICAgICAgICAgICAgIHRyYWNrc1tpXS5nLnJlbW92ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgX2luaXRfdHJhY2sodHJhY2tzW2ldKTtcbiAgICAgICAgfVxuICAgICAgICBfcGxhY2VfdHJhY2tzKCk7XG5cbiAgICAgICAgLy8gVGhlIGNvbnRpbnVhdGlvbiBjYWxsYmFja1xuICAgICAgICB2YXIgY29udCA9IGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICBsaW1pdHMucmlnaHQgPSByZXNwO1xuXG4gICAgICAgICAgICAvLyB6b29tRXZlbnRIYW5kbGVyLnhFeHRlbnQoW2xpbWl0cy5sZWZ0LCBsaW1pdHMucmlnaHRdKTtcbiAgICAgICAgICAgIGlmICgobG9jLnRvIC0gbG9jLmZyb20pIDwgbGltaXRzLnpvb21faW4pIHtcbiAgICAgICAgICAgICAgICBpZiAoKGxvYy5mcm9tICsgbGltaXRzLnpvb21faW4pID4gbGltaXRzLnJpZ2h0KSB7XG4gICAgICAgICAgICAgICAgICAgIGxvYy50byA9IGxpbWl0cy5yaWdodDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsb2MudG8gPSBsb2MuZnJvbSArIGxpbWl0cy56b29tX2luO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBsb3QoKTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpPHRyYWNrcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIF91cGRhdGVfdHJhY2sodHJhY2tzW2ldLCBsb2MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIElmIGxpbWl0cy5yaWdodCBpcyBhIGZ1bmN0aW9uLCB3ZSBoYXZlIHRvIGNhbGwgaXQgYXN5bmNocm9ub3VzbHkgYW5kXG4gICAgICAgIC8vIHRoZW4gc3RhcnRpbmcgdGhlIHBsb3Qgb25jZSB3ZSBoYXZlIHNldCB0aGUgcmlnaHQgbGltaXQgKHBsb3QpXG4gICAgICAgIC8vIElmIG5vdCwgd2UgYXNzdW1lIHRoYXQgaXQgaXMgYW4gb2JqZXQgd2l0aCBuZXcgKG1heWJlIHBhcnRpYWxseSBkZWZpbmVkKVxuICAgICAgICAvLyBkZWZpbml0aW9ucyBvZiB0aGUgbGltaXRzIGFuZCB3ZSBjYW4gcGxvdCBkaXJlY3RseVxuICAgICAgICAvLyBUT0RPOiBSaWdodCBub3csIG9ubHkgcmlnaHQgY2FuIGJlIGNhbGxlZCBhcyBhbiBhc3luYyBmdW5jdGlvbiB3aGljaCBpcyB3ZWFrXG4gICAgICAgIGlmICh0eXBlb2YgKGxpbWl0cy5yaWdodCkgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGxpbWl0cy5yaWdodChjb250KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnQobGltaXRzLnJpZ2h0KTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ3VwZGF0ZScsIGZ1bmN0aW9uICgpIHtcbiAgICBcdGZvciAodmFyIGk9MDsgaTx0cmFja3MubGVuZ3RoOyBpKyspIHtcbiAgICBcdCAgICBfdXBkYXRlX3RyYWNrICh0cmFja3NbaV0pO1xuICAgIFx0fVxuICAgIH0pO1xuXG4gICAgdmFyIF91cGRhdGVfdHJhY2sgPSBmdW5jdGlvbiAodHJhY2ssIHdoZXJlKSB7XG4gICAgXHRpZiAodHJhY2suZGF0YSgpKSB7XG4gICAgXHQgICAgdmFyIHRyYWNrX2RhdGEgPSB0cmFjay5kYXRhKCk7XG4gICAgXHQgICAgdmFyIGRhdGFfdXBkYXRlciA9IHRyYWNrX2RhdGEudXBkYXRlKCk7XG4gICAgXHQgICAgLy92YXIgZGF0YV91cGRhdGVyID0gdHJhY2suZGF0YSgpLnVwZGF0ZSgpO1xuICAgIFx0ICAgIGRhdGFfdXBkYXRlci5jYWxsKHRyYWNrX2RhdGEsIHtcbiAgICBcdFx0J2xvYycgOiB3aGVyZSxcbiAgICBcdFx0J29uX3N1Y2Nlc3MnIDogZnVuY3Rpb24gKCkge1xuICAgIFx0XHQgICAgdHJhY2suZGlzcGxheSgpLnVwZGF0ZS5jYWxsKHRyYWNrLCB4U2NhbGUsIHdoZXJlKTtcbiAgICBcdFx0fVxuICAgIFx0ICAgIH0pO1xuICAgIFx0fVxuICAgIH07XG5cbiAgICB2YXIgcGxvdCA9IGZ1bmN0aW9uKCkge1xuICAgIFx0eFNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICBcdCAgICAuZG9tYWluKFtsb2MuZnJvbSwgbG9jLnRvXSlcbiAgICBcdCAgICAucmFuZ2UoWzAsIHdpZHRoXSk7XG5cbiAgICBcdGlmIChkcmFnX2FsbG93ZWQpIHtcbiAgICBcdCAgICBzdmdfZy5jYWxsKCB6b29tRXZlbnRIYW5kbGVyXG4gICAgXHRcdCAgICAgICAueCh4U2NhbGUpXG4gICAgXHRcdCAgICAgICAuc2NhbGVFeHRlbnQoWyhsb2MudG8tbG9jLmZyb20pLyhsaW1pdHMuem9vbV9vdXQtMSksIChsb2MudG8tbG9jLmZyb20pL2xpbWl0cy56b29tX2luXSlcbiAgICBcdFx0ICAgICAgIC5vbihcInpvb21cIiwgX21vdmUpXG4gICAgXHRcdCAgICAgKTtcbiAgICBcdH1cbiAgICB9O1xuXG4gICAgLy8gcmlnaHQvbGVmdC96b29tIHBhbnMgb3Igem9vbXMgdGhlIHRyYWNrLiBUaGVzZSBtZXRob2RzIGFyZSBleHBvc2VkIHRvIGFsbG93IGV4dGVybmFsIGJ1dHRvbnMsIGV0YyB0byBpbnRlcmFjdCB3aXRoIHRoZSB0cmFja3MuIFRoZSBhcmd1bWVudCBpcyB0aGUgYW1vdW50IG9mIHBhbm5pbmcvem9vbWluZyAoaWUuIDEuMiBtZWFucyAyMCUgcGFubmluZykgV2l0aCBsZWZ0L3JpZ2h0IG9ubHkgcG9zaXRpdmUgbnVtYmVycyBhcmUgYWxsb3dlZC5cbiAgICBhcGkubWV0aG9kICgnbW92ZV9yaWdodCcsIGZ1bmN0aW9uIChmYWN0b3IpIHtcbiAgICBcdGlmIChmYWN0b3IgPiAwKSB7XG4gICAgXHQgICAgX21hbnVhbF9tb3ZlKGZhY3RvciwgMSk7XG4gICAgXHR9XG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kICgnbW92ZV9sZWZ0JywgZnVuY3Rpb24gKGZhY3Rvcikge1xuICAgIFx0aWYgKGZhY3RvciA+IDApIHtcbiAgICBcdCAgICBfbWFudWFsX21vdmUoZmFjdG9yLCAtMSk7XG4gICAgXHR9XG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kICgnem9vbScsIGZ1bmN0aW9uIChmYWN0b3IpIHtcbiAgICAgICAgX21hbnVhbF9tb3ZlKGZhY3RvciwgMCk7XG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kICgnZmluZF90cmFja19ieV9pZCcsIGZ1bmN0aW9uIChpZCkge1xuICAgIFx0Zm9yICh2YXIgaT0wOyBpPHRyYWNrcy5sZW5ndGg7IGkrKykge1xuICAgIFx0ICAgIGlmICh0cmFja3NbaV0uaWQoKSA9PT0gaWQpIHtcbiAgICBcdFx0cmV0dXJuIHRyYWNrc1tpXTtcbiAgICBcdCAgICB9XG4gICAgXHR9XG4gICAgfSk7XG5cbiAgICBhcGkubWV0aG9kICgncmVvcmRlcicsIGZ1bmN0aW9uIChuZXdfdHJhY2tzKSB7XG4gICAgXHQvLyBUT0RPOiBUaGlzIGlzIGRlZmluaW5nIGEgbmV3IGhlaWdodCwgYnV0IHRoZSBnbG9iYWwgaGVpZ2h0IGlzIHVzZWQgdG8gZGVmaW5lIHRoZSBzaXplIG9mIHNldmVyYWxcbiAgICBcdC8vIHBhcnRzLiBXZSBzaG91bGQgZG8gdGhpcyBkeW5hbWljYWxseVxuXG4gICAgICAgIHZhciBmb3VuZF9pbmRleGVzID0gW107XG4gICAgXHRmb3IgKHZhciBqPTA7IGo8bmV3X3RyYWNrcy5sZW5ndGg7IGorKykge1xuICAgIFx0ICAgIHZhciBmb3VuZCA9IGZhbHNlO1xuICAgIFx0ICAgIGZvciAodmFyIGk9MDsgaTx0cmFja3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgXHRcdGlmICh0cmFja3NbaV0uaWQoKSA9PT0gbmV3X3RyYWNrc1tqXS5pZCgpKSB7XG4gICAgICAgIFx0XHQgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBmb3VuZF9pbmRleGVzW2ldID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgLy8gdHJhY2tzLnNwbGljZShpLDEpO1xuICAgICAgICBcdFx0ICAgIGJyZWFrO1xuICAgICAgICBcdFx0fVxuICAgIFx0ICAgIH1cbiAgICBcdCAgICBpZiAoIWZvdW5kKSB7XG4gICAgICAgICAgICAgICAgX2luaXRfdHJhY2sobmV3X3RyYWNrc1tqXSk7XG4gICAgICAgIFx0XHRfdXBkYXRlX3RyYWNrKG5ld190cmFja3Nbal0sIHtmcm9tIDogbG9jLmZyb20sIHRvIDogbG9jLnRvfSk7XG4gICAgXHQgICAgfVxuICAgIFx0fVxuXG4gICAgXHRmb3IgKHZhciB4PTA7IHg8dHJhY2tzLmxlbmd0aDsgeCsrKSB7XG4gICAgICAgICAgICBpZiAoIWZvdW5kX2luZGV4ZXNbeF0pIHtcbiAgICAgICAgICAgICAgICB0cmFja3NbeF0uZy5yZW1vdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICBcdH1cblxuICAgIFx0dHJhY2tzID0gbmV3X3RyYWNrcztcbiAgICBcdF9wbGFjZV90cmFja3MoKTtcblxuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ3JlbW92ZV90cmFjaycsIGZ1bmN0aW9uICh0cmFjaykge1xuICAgICAgICB0cmFjay5nLnJlbW92ZSgpO1xuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCAoJ2FkZF90cmFjaycsIGZ1bmN0aW9uICh0cmFjaykge1xuICAgIFx0aWYgKHRyYWNrIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICBcdCAgICBmb3IgKHZhciBpPTA7IGk8dHJhY2subGVuZ3RoOyBpKyspIHtcbiAgICBcdFx0dHJhY2tfdmlzLmFkZF90cmFjayAodHJhY2tbaV0pO1xuICAgIFx0ICAgIH1cbiAgICBcdCAgICByZXR1cm4gdHJhY2tfdmlzO1xuICAgIFx0fVxuICAgIFx0dHJhY2tzLnB1c2godHJhY2spO1xuICAgIFx0cmV0dXJuIHRyYWNrX3ZpcztcbiAgICB9KTtcblxuICAgIGFwaS5tZXRob2QoJ3RyYWNrcycsIGZ1bmN0aW9uIChuZXdfdHJhY2tzKSB7XG4gICAgXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICBcdCAgICByZXR1cm4gdHJhY2tzO1xuICAgIFx0fVxuICAgIFx0dHJhY2tzID0gbmV3X3RyYWNrcztcbiAgICBcdHJldHVybiB0cmFja192aXM7XG4gICAgfSk7XG5cbiAgICAvL1xuICAgIGFwaS5tZXRob2QgKCd3aWR0aCcsIGZ1bmN0aW9uICh3KSB7XG4gICAgXHQvLyBUT0RPOiBBbGxvdyBzdWZmaXhlcyBsaWtlIFwiMTAwMHB4XCI/XG4gICAgXHQvLyBUT0RPOiBUZXN0IHdyb25nIGZvcm1hdHNcbiAgICBcdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIFx0ICAgIHJldHVybiB3aWR0aDtcbiAgICBcdH1cbiAgICBcdC8vIEF0IGxlYXN0IG1pbi13aWR0aFxuICAgIFx0aWYgKHcgPCBtaW5fd2lkdGgpIHtcbiAgICBcdCAgICB3ID0gbWluX3dpZHRoO1xuICAgIFx0fVxuXG4gICAgXHQvLyBXZSBhcmUgcmVzaXppbmdcbiAgICBcdGlmIChkaXZfaWQgIT09IHVuZGVmaW5lZCkge1xuICAgIFx0ICAgIGQzLnNlbGVjdChcIiN0bnRfXCIgKyBkaXZfaWQpLnNlbGVjdChcInN2Z1wiKS5hdHRyKFwid2lkdGhcIiwgdyk7XG4gICAgXHQgICAgLy8gUmVzaXplIHRoZSB6b29taW5nL3Bhbm5pbmcgcGFuZVxuICAgIFx0ICAgIGQzLnNlbGVjdChcIiN0bnRfXCIgKyBkaXZfaWQpLnN0eWxlKFwid2lkdGhcIiwgKHBhcnNlSW50KHcpICsgY2FwX3dpZHRoKjIpICsgXCJweFwiKTtcbiAgICBcdCAgICBkMy5zZWxlY3QoXCIjdG50X1wiICsgZGl2X2lkICsgXCJfcGFuZVwiKS5hdHRyKFwid2lkdGhcIiwgdyk7XG5cbiAgICBcdCAgICAvLyBSZXBsb3RcbiAgICBcdCAgICB3aWR0aCA9IHc7XG4gICAgXHQgICAgcGxvdCgpO1xuICAgIFx0ICAgIGZvciAodmFyIGk9MDsgaTx0cmFja3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgXHRcdHRyYWNrc1tpXS5nLnNlbGVjdChcInJlY3RcIikuYXR0cihcIndpZHRoXCIsIHcpO1xuICAgICAgICBcdFx0dHJhY2tzW2ldLmRpc3BsYXkoKS5yZXNldC5jYWxsKHRyYWNrc1tpXSk7XG4gICAgICAgIFx0XHR0cmFja3NbaV0uZGlzcGxheSgpLnVwZGF0ZS5jYWxsKHRyYWNrc1tpXSx4U2NhbGUpO1xuICAgIFx0ICAgIH1cbiAgICBcdH0gZWxzZSB7XG4gICAgXHQgICAgd2lkdGggPSB3O1xuICAgIFx0fVxuICAgICAgICByZXR1cm4gdHJhY2tfdmlzO1xuICAgIH0pO1xuXG4gICAgYXBpLm1ldGhvZCgnYWxsb3dfZHJhZycsIGZ1bmN0aW9uKGIpIHtcblx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdCAgICByZXR1cm4gZHJhZ19hbGxvd2VkO1xuXHR9XG5cdGRyYWdfYWxsb3dlZCA9IGI7XG5cdGlmIChkcmFnX2FsbG93ZWQpIHtcblx0ICAgIC8vIFdoZW4gdGhpcyBtZXRob2QgaXMgY2FsbGVkIG9uIHRoZSBvYmplY3QgYmVmb3JlIHN0YXJ0aW5nIHRoZSBzaW11bGF0aW9uLCB3ZSBkb24ndCBoYXZlIGRlZmluZWQgeFNjYWxlXG5cdCAgICBpZiAoeFNjYWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRzdmdfZy5jYWxsKCB6b29tRXZlbnRIYW5kbGVyLngoeFNjYWxlKVxuXHRcdFx0ICAgLy8gLnhFeHRlbnQoWzAsIGxpbWl0cy5yaWdodF0pXG5cdFx0XHQgICAuc2NhbGVFeHRlbnQoWyhsb2MudG8tbG9jLmZyb20pLyhsaW1pdHMuem9vbV9vdXQtMSksIChsb2MudG8tbG9jLmZyb20pL2xpbWl0cy56b29tX2luXSlcblx0XHRcdCAgIC5vbihcInpvb21cIiwgX21vdmUpICk7XG5cdCAgICB9XG5cdH0gZWxzZSB7XG5cdCAgICAvLyBXZSBjcmVhdGUgYSBuZXcgZHVtbXkgc2NhbGUgaW4geCB0byBhdm9pZCBkcmFnZ2luZyB0aGUgcHJldmlvdXMgb25lXG5cdCAgICAvLyBUT0RPOiBUaGVyZSBtYXkgYmUgYSBjaGVhcGVyIHdheSBvZiBkb2luZyB0aGlzP1xuXHQgICAgem9vbUV2ZW50SGFuZGxlci54KGQzLnNjYWxlLmxpbmVhcigpKS5vbihcInpvb21cIiwgbnVsbCk7XG5cdH1cblx0cmV0dXJuIHRyYWNrX3ZpcztcbiAgICB9KTtcblxuICAgIHZhciBfcGxhY2VfdHJhY2tzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaCA9IDA7XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTx0cmFja3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciB0cmFjayA9IHRyYWNrc1tpXTtcbiAgICAgICAgICAgIGlmICh0cmFjay5nLmF0dHIoXCJ0cmFuc2Zvcm1cIikpIHtcbiAgICAgICAgICAgICAgICB0cmFjay5nXG4gICAgICAgICAgICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAgICAgICAgICAgLmR1cmF0aW9uKGR1cilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBleHBvcnRzLmV4dGVuZF9jYW52YXMubGVmdCArIFwiLFwiICsgaCArIFwiKVwiKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdHJhY2suZ1xuICAgICAgICAgICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIGV4cG9ydHMuZXh0ZW5kX2NhbnZhcy5sZWZ0ICsgXCIsXCIgKyBoICsgXCIpXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBoICs9IHRyYWNrLmhlaWdodCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gc3ZnXG4gICAgICAgIHN2Zy5hdHRyKFwiaGVpZ2h0XCIsIGggKyBoZWlnaHRfb2Zmc2V0KTtcblxuICAgICAgICAvLyBkaXZcbiAgICAgICAgZDMuc2VsZWN0KFwiI3RudF9cIiArIGRpdl9pZClcbiAgICAgICAgICAgIC5zdHlsZShcImhlaWdodFwiLCAoaCArIDEwICsgaGVpZ2h0X29mZnNldCkgKyBcInB4XCIpO1xuXG4gICAgICAgIC8vIGNhcHNcbiAgICAgICAgZDMuc2VsZWN0KFwiI3RudF9cIiArIGRpdl9pZCArIFwiXzVwY2FwXCIpXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBoKVxuICAgICAgICAgICAgLy8gLm1vdmVfdG9fZnJvbnQoKVxuICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICBtb3ZlX3RvX2Zyb250KHRoaXMpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgZDMuc2VsZWN0KFwiI3RudF9cIiArIGRpdl9pZCArIFwiXzNwY2FwXCIpXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBoKVxuICAgICAgICAgICAgLy8ubW92ZV90b19mcm9udCgpXG4gICAgICAgICAgICAuZWFjaCAoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICBtb3ZlX3RvX2Zyb250KHRoaXMpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gcGFuZVxuICAgICAgICBwYW5lXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBoICsgaGVpZ2h0X29mZnNldCk7XG5cbiAgICAgICAgcmV0dXJuIHRyYWNrX3ZpcztcbiAgICB9O1xuXG4gICAgdmFyIF9pbml0X3RyYWNrID0gZnVuY3Rpb24gKHRyYWNrKSB7XG4gICAgICAgIHRyYWNrLmcgPSBzdmcuc2VsZWN0KFwiZ1wiKS5zZWxlY3QoXCJnXCIpXG4gICAgXHQgICAgLmFwcGVuZChcImdcIilcbiAgICBcdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3RyYWNrXCIpXG4gICAgXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgdHJhY2suaGVpZ2h0KCkpO1xuXG4gICAgXHQvLyBSZWN0IGZvciB0aGUgYmFja2dyb3VuZCBjb2xvclxuICAgIFx0dHJhY2suZ1xuICAgIFx0ICAgIC5hcHBlbmQoXCJyZWN0XCIpXG4gICAgXHQgICAgLmF0dHIoXCJ4XCIsIDApXG4gICAgXHQgICAgLmF0dHIoXCJ5XCIsIDApXG4gICAgXHQgICAgLmF0dHIoXCJ3aWR0aFwiLCB0cmFja192aXMud2lkdGgoKSlcbiAgICBcdCAgICAuYXR0cihcImhlaWdodFwiLCB0cmFjay5oZWlnaHQoKSlcbiAgICBcdCAgICAuc3R5bGUoXCJmaWxsXCIsIHRyYWNrLmJhY2tncm91bmRfY29sb3IoKSlcbiAgICBcdCAgICAuc3R5bGUoXCJwb2ludGVyLWV2ZW50c1wiLCBcIm5vbmVcIik7XG5cbiAgICBcdGlmICh0cmFjay5kaXNwbGF5KCkpIHtcbiAgICBcdCAgICB0cmFjay5kaXNwbGF5KCkuaW5pdC5jYWxsKHRyYWNrLCB3aWR0aCk7XG4gICAgXHR9XG5cbiAgICBcdHJldHVybiB0cmFja192aXM7XG4gICAgfTtcblxuICAgIHZhciBfbWFudWFsX21vdmUgPSBmdW5jdGlvbiAoZmFjdG9yLCBkaXJlY3Rpb24pIHtcbiAgICAgICAgdmFyIG9sZERvbWFpbiA9IHhTY2FsZS5kb21haW4oKTtcblxuICAgIFx0dmFyIHNwYW4gPSBvbGREb21haW5bMV0gLSBvbGREb21haW5bMF07XG4gICAgXHR2YXIgb2Zmc2V0ID0gKHNwYW4gKiBmYWN0b3IpIC0gc3BhbjtcblxuICAgIFx0dmFyIG5ld0RvbWFpbjtcbiAgICBcdHN3aXRjaCAoZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlIC0xIDpcbiAgICAgICAgICAgIG5ld0RvbWFpbiA9IFsofn5vbGREb21haW5bMF0gLSBvZmZzZXQpLCB+fihvbGREb21haW5bMV0gLSBvZmZzZXQpXTtcbiAgICBcdCAgICBicmVhaztcbiAgICAgICAgXHRjYXNlIDEgOlxuICAgICAgICBcdCAgICBuZXdEb21haW4gPSBbKH5+b2xkRG9tYWluWzBdICsgb2Zmc2V0KSwgfn4ob2xkRG9tYWluWzFdIC0gb2Zmc2V0KV07XG4gICAgICAgIFx0ICAgIGJyZWFrO1xuICAgICAgICBcdGNhc2UgMCA6XG4gICAgICAgIFx0ICAgIG5ld0RvbWFpbiA9IFtvbGREb21haW5bMF0gLSB+fihvZmZzZXQvMiksIG9sZERvbWFpblsxXSArICh+fm9mZnNldC8yKV07XG4gICAgXHR9XG5cbiAgICBcdHZhciBpbnRlcnBvbGF0b3IgPSBkMy5pbnRlcnBvbGF0ZU51bWJlcihvbGREb21haW5bMF0sIG5ld0RvbWFpblswXSk7XG4gICAgXHR2YXIgZWFzZSA9IGV4cG9ydHMuZWFzZTtcblxuICAgIFx0dmFyIHggPSAwO1xuICAgIFx0ZDMudGltZXIoZnVuY3Rpb24oKSB7XG4gICAgXHQgICAgdmFyIGN1cnJfc3RhcnQgPSBpbnRlcnBvbGF0b3IoZWFzZSh4KSk7XG4gICAgXHQgICAgdmFyIGN1cnJfZW5kO1xuICAgIFx0ICAgIHN3aXRjaCAoZGlyZWN0aW9uKSB7XG4gICAgICAgIFx0ICAgIGNhc2UgLTEgOlxuICAgICAgICBcdFx0Y3Vycl9lbmQgPSBjdXJyX3N0YXJ0ICsgc3BhbjtcbiAgICAgICAgXHRcdGJyZWFrO1xuICAgICAgICBcdCAgICBjYXNlIDEgOlxuICAgICAgICBcdFx0Y3Vycl9lbmQgPSBjdXJyX3N0YXJ0ICsgc3BhbjtcbiAgICAgICAgXHRcdGJyZWFrO1xuICAgICAgICBcdCAgICBjYXNlIDAgOlxuICAgICAgICBcdFx0Y3Vycl9lbmQgPSBvbGREb21haW5bMV0gKyBvbGREb21haW5bMF0gLSBjdXJyX3N0YXJ0O1xuICAgICAgICBcdFx0YnJlYWs7XG4gICAgXHQgICAgfVxuXG4gICAgXHQgICAgdmFyIGN1cnJEb21haW4gPSBbY3Vycl9zdGFydCwgY3Vycl9lbmRdO1xuICAgIFx0ICAgIHhTY2FsZS5kb21haW4oY3VyckRvbWFpbik7XG4gICAgXHQgICAgX21vdmUoeFNjYWxlKTtcbiAgICBcdCAgICB4Kz0wLjAyO1xuICAgIFx0ICAgIHJldHVybiB4PjE7XG4gICAgXHR9KTtcbiAgICB9O1xuXG5cbiAgICB2YXIgX21vdmVfY2JhayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGN1cnJEb21haW4gPSB4U2NhbGUuZG9tYWluKCk7XG4gICAgXHR0cmFja192aXMuZnJvbSh+fmN1cnJEb21haW5bMF0pO1xuICAgIFx0dHJhY2tfdmlzLnRvKH5+Y3VyckRvbWFpblsxXSk7XG5cbiAgICBcdGZvciAodmFyIGkgPSAwOyBpIDwgdHJhY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgXHQgICAgdmFyIHRyYWNrID0gdHJhY2tzW2ldO1xuICAgIFx0ICAgIF91cGRhdGVfdHJhY2sodHJhY2ssIGxvYyk7XG4gICAgXHR9XG4gICAgfTtcbiAgICAvLyBUaGUgZGVmZXJyZWRfY2JhayBpcyBkZWZlcnJlZCBhdCBsZWFzdCB0aGlzIGFtb3VudCBvZiB0aW1lIG9yIHJlLXNjaGVkdWxlZCBpZiBkZWZlcnJlZCBpcyBjYWxsZWQgYmVmb3JlXG4gICAgdmFyIF9kZWZlcnJlZCA9IGRlZmVyQ2FuY2VsKF9tb3ZlX2NiYWssIDMwMCk7XG5cbiAgICAvLyBhcGkubWV0aG9kKCd1cGRhdGUnLCBmdW5jdGlvbiAoKSB7XG4gICAgLy8gXHRfbW92ZSgpO1xuICAgIC8vIH0pO1xuXG4gICAgdmFyIF9tb3ZlID0gZnVuY3Rpb24gKG5ld194U2NhbGUpIHtcbiAgICBcdGlmIChuZXdfeFNjYWxlICE9PSB1bmRlZmluZWQgJiYgZHJhZ19hbGxvd2VkKSB7XG4gICAgXHQgICAgem9vbUV2ZW50SGFuZGxlci54KG5ld194U2NhbGUpO1xuICAgIFx0fVxuXG4gICAgXHQvLyBTaG93IHRoZSByZWQgYmFycyBhdCB0aGUgbGltaXRzXG4gICAgXHR2YXIgZG9tYWluID0geFNjYWxlLmRvbWFpbigpO1xuICAgIFx0aWYgKGRvbWFpblswXSA8PSA1KSB7XG4gICAgXHQgICAgZDMuc2VsZWN0KFwiI3RudF9cIiArIGRpdl9pZCArIFwiXzVwY2FwXCIpXG4gICAgXHRcdC5hdHRyKFwid2lkdGhcIiwgY2FwX3dpZHRoKVxuICAgIFx0XHQudHJhbnNpdGlvbigpXG4gICAgXHRcdC5kdXJhdGlvbigyMDApXG4gICAgXHRcdC5hdHRyKFwid2lkdGhcIiwgMCk7XG4gICAgXHR9XG5cbiAgICBcdGlmIChkb21haW5bMV0gPj0gKGxpbWl0cy5yaWdodCktNSkge1xuICAgIFx0ICAgIGQzLnNlbGVjdChcIiN0bnRfXCIgKyBkaXZfaWQgKyBcIl8zcGNhcFwiKVxuICAgIFx0XHQuYXR0cihcIndpZHRoXCIsIGNhcF93aWR0aClcbiAgICBcdFx0LnRyYW5zaXRpb24oKVxuICAgIFx0XHQuZHVyYXRpb24oMjAwKVxuICAgIFx0XHQuYXR0cihcIndpZHRoXCIsIDApO1xuICAgIFx0fVxuXG5cbiAgICBcdC8vIEF2b2lkIG1vdmluZyBwYXN0IHRoZSBsaW1pdHNcbiAgICBcdGlmIChkb21haW5bMF0gPCBsaW1pdHMubGVmdCkge1xuICAgIFx0ICAgIHpvb21FdmVudEhhbmRsZXIudHJhbnNsYXRlKFt6b29tRXZlbnRIYW5kbGVyLnRyYW5zbGF0ZSgpWzBdIC0geFNjYWxlKGxpbWl0cy5sZWZ0KSArIHhTY2FsZS5yYW5nZSgpWzBdLCB6b29tRXZlbnRIYW5kbGVyLnRyYW5zbGF0ZSgpWzFdXSk7XG4gICAgXHR9IGVsc2UgaWYgKGRvbWFpblsxXSA+IGxpbWl0cy5yaWdodCkge1xuICAgIFx0ICAgIHpvb21FdmVudEhhbmRsZXIudHJhbnNsYXRlKFt6b29tRXZlbnRIYW5kbGVyLnRyYW5zbGF0ZSgpWzBdIC0geFNjYWxlKGxpbWl0cy5yaWdodCkgKyB4U2NhbGUucmFuZ2UoKVsxXSwgem9vbUV2ZW50SGFuZGxlci50cmFuc2xhdGUoKVsxXV0pO1xuICAgIFx0fVxuXG4gICAgXHRfZGVmZXJyZWQoKTtcblxuICAgIFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0cmFja3MubGVuZ3RoOyBpKyspIHtcbiAgICBcdCAgICB2YXIgdHJhY2sgPSB0cmFja3NbaV07XG4gICAgXHQgICAgdHJhY2suZGlzcGxheSgpLm1vdmUuY2FsbCh0cmFjayx4U2NhbGUpO1xuICAgIFx0fVxuICAgIH07XG5cbiAgICAvLyBhcGkubWV0aG9kKHtcbiAgICAvLyBcdGFsbG93X2RyYWcgOiBhcGlfYWxsb3dfZHJhZyxcbiAgICAvLyBcdHdpZHRoICAgICAgOiBhcGlfd2lkdGgsXG4gICAgLy8gXHRhZGRfdHJhY2sgIDogYXBpX2FkZF90cmFjayxcbiAgICAvLyBcdHJlb3JkZXIgICAgOiBhcGlfcmVvcmRlcixcbiAgICAvLyBcdHpvb20gICAgICAgOiBhcGlfem9vbSxcbiAgICAvLyBcdGxlZnQgICAgICAgOiBhcGlfbGVmdCxcbiAgICAvLyBcdHJpZ2h0ICAgICAgOiBhcGlfcmlnaHQsXG4gICAgLy8gXHRzdGFydCAgICAgIDogYXBpX3N0YXJ0XG4gICAgLy8gfSk7XG5cbiAgICAvLyBBdXhpbGlhciBmdW5jdGlvbnNcbiAgICBmdW5jdGlvbiBtb3ZlX3RvX2Zyb250IChlbGVtKSB7XG4gICAgICAgIGVsZW0ucGFyZW50Tm9kZS5hcHBlbmRDaGlsZChlbGVtKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJhY2tfdmlzO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gYm9hcmQ7XG4iLCJ2YXIgYXBpanMgPSByZXF1aXJlIChcInRudC5hcGlcIik7XG4vLyB2YXIgZW5zZW1ibFJlc3RBUEkgPSByZXF1aXJlKFwidG50LmVuc2VtYmxcIik7XG5cbi8vIHZhciBib2FyZCA9IHt9O1xuLy8gYm9hcmQudHJhY2sgPSB7fTtcblxudmFyIGRhdGEgPSBmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICB2YXIgXyA9IGZ1bmN0aW9uICgpIHt9O1xuXG4gICAgLy8gR2V0dGVycyAvIFNldHRlcnNcbiAgICBhcGlqcyAoXylcbiAgICAvLyBsYWJlbCBpcyBub3QgdXNlZCBhdCB0aGUgbW9tZW50XG5cdC5nZXRzZXQgKCdsYWJlbCcsIFwiXCIpXG5cdC5nZXRzZXQgKCdlbGVtZW50cycsIFtdKVxuXHQuZ2V0c2V0ICgndXBkYXRlJywgZnVuY3Rpb24gKCkge30pO1xuXG4gICAgcmV0dXJuIF87XG59O1xuXG4vLyBUaGUgcmV0cmlldmVycy4gVGhleSBuZWVkIHRvIGFjY2VzcyAnZWxlbWVudHMnXG5kYXRhLnJldHJpZXZlciA9IHt9O1xuXG5kYXRhLnJldHJpZXZlci5zeW5jID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHVwZGF0ZV90cmFjayA9IGZ1bmN0aW9uKG9iaikge1xuXHQvLyBcInRoaXNcIiBpcyBzZXQgdG8gdGhlIGRhdGEgb2JqXG4gICAgICAgIHRoaXMuZWxlbWVudHModXBkYXRlX3RyYWNrLnJldHJpZXZlcigpKG9iai5sb2MpKTtcbiAgICAgICAgb2JqLm9uX3N1Y2Nlc3MoKTtcbiAgICB9O1xuXG4gICAgYXBpanMgKHVwZGF0ZV90cmFjaylcblx0ICAgLmdldHNldCAoJ3JldHJpZXZlcicsIGZ1bmN0aW9uICgpIHt9KTtcblxuICAgIHJldHVybiB1cGRhdGVfdHJhY2s7XG59O1xuXG5kYXRhLnJldHJpZXZlci5hc3luYyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdXJsID0gJyc7XG5cbiAgICAvLyBcInRoaXNcIiBpcyBzZXQgdG8gdGhlIGRhdGEgb2JqXG4gICAgdmFyIGRhdGFfb2JqID0gdGhpcztcbiAgICB2YXIgdXBkYXRlX3RyYWNrID0gZnVuY3Rpb24gKG9iaikge1xuICAgIFx0ZDMuanNvbih1cmwsIGZ1bmN0aW9uIChlcnIsIHJlc3ApIHtcbiAgICBcdCAgICBkYXRhX29iai5lbGVtZW50cyhyZXNwKTtcbiAgICBcdCAgICBvYmoub25fc3VjY2VzcygpO1xuICAgIFx0fSk7XG4gICAgfTtcblxuICAgIGFwaWpzICh1cGRhdGVfdHJhY2spXG5cdC5nZXRzZXQgKCd1cmwnLCAnJyk7XG5cbiAgICByZXR1cm4gdXBkYXRlX3RyYWNrO1xufTtcblxuXG4vLyBBIHByZWRlZmluZWQgdHJhY2sgZGlzcGxheWluZyBubyBleHRlcm5hbCBkYXRhXG4vLyBpdCBpcyB1c2VkIGZvciBsb2NhdGlvbiBhbmQgYXhpcyB0cmFja3MgZm9yIGV4YW1wbGVcbmRhdGEuZW1wdHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHRyYWNrID0gZGF0YSgpO1xuICAgIHZhciB1cGRhdGVyID0gZGF0YS5yZXRyaWV2ZXIuc3luYygpO1xuICAgIHRyYWNrLnVwZGF0ZSh1cGRhdGVyKTtcblxuICAgIHJldHVybiB0cmFjaztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IGRhdGE7XG4iLCJ2YXIgYXBpanMgPSByZXF1aXJlIChcInRudC5hcGlcIik7XG52YXIgbGF5b3V0ID0gcmVxdWlyZShcIi4vbGF5b3V0LmpzXCIpO1xuXG4vLyBGRUFUVVJFIFZJU1xuLy8gdmFyIGJvYXJkID0ge307XG4vLyBib2FyZC50cmFjayA9IHt9O1xudmFyIHRudF9mZWF0dXJlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBkaXNwYXRjaCA9IGQzLmRpc3BhdGNoIChcImNsaWNrXCIsIFwiZGJsY2xpY2tcIiwgXCJtb3VzZW92ZXJcIiwgXCJtb3VzZW91dFwiKTtcblxuICAgIC8vLy8vLyBWYXJzIGV4cG9zZWQgaW4gdGhlIEFQSVxuICAgIHZhciBleHBvcnRzID0ge1xuICAgICAgICBjcmVhdGUgICA6IGZ1bmN0aW9uICgpIHt0aHJvdyBcImNyZWF0ZV9lbGVtIGlzIG5vdCBkZWZpbmVkIGluIHRoZSBiYXNlIGZlYXR1cmUgb2JqZWN0XCI7fSxcbiAgICAgICAgbW92ZXIgICAgOiBmdW5jdGlvbiAoKSB7dGhyb3cgXCJtb3ZlX2VsZW0gaXMgbm90IGRlZmluZWQgaW4gdGhlIGJhc2UgZmVhdHVyZSBvYmplY3RcIjt9LFxuICAgICAgICB1cGRhdGVyICA6IGZ1bmN0aW9uICgpIHt9LFxuICAgICAgICBndWlkZXIgICA6IGZ1bmN0aW9uICgpIHt9LFxuICAgICAgICAvL2xheW91dCAgIDogZnVuY3Rpb24gKCkge30sXG4gICAgICAgIGluZGV4ICAgIDogdW5kZWZpbmVkLFxuICAgICAgICBsYXlvdXQgICA6IGxheW91dC5pZGVudGl0eSgpLFxuICAgICAgICBmb3JlZ3JvdW5kX2NvbG9yIDogJyMwMDAnXG4gICAgfTtcblxuXG4gICAgLy8gVGhlIHJldHVybmVkIG9iamVjdFxuICAgIHZhciBmZWF0dXJlID0ge307XG5cbiAgICB2YXIgcmVzZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgXHR2YXIgdHJhY2sgPSB0aGlzO1xuICAgIFx0dHJhY2suZy5zZWxlY3RBbGwoXCIudG50X2VsZW1cIikucmVtb3ZlKCk7XG4gICAgICAgIHRyYWNrLmcuc2VsZWN0QWxsKFwiLnRudF9ndWlkZXJcIikucmVtb3ZlKCk7XG4gICAgfTtcblxuICAgIHZhciBpbml0ID0gZnVuY3Rpb24gKHdpZHRoKSB7XG4gICAgICAgIHZhciB0cmFjayA9IHRoaXM7XG5cbiAgICAgICAgdHJhY2suZ1xuICAgICAgICAgICAgLmFwcGVuZCAoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0ciAoXCJ4XCIsIDUpXG4gICAgICAgICAgICAuYXR0ciAoXCJ5XCIsIDEyKVxuICAgICAgICAgICAgLmF0dHIgKFwiZm9udC1zaXplXCIsIDExKVxuICAgICAgICAgICAgLmF0dHIgKFwiZmlsbFwiLCBcImdyZXlcIilcbiAgICAgICAgICAgIC50ZXh0ICh0cmFjay5sYWJlbCgpKTtcblxuICAgICAgICBleHBvcnRzLmd1aWRlci5jYWxsKHRyYWNrLCB3aWR0aCk7XG4gICAgfTtcblxuICAgIHZhciBwbG90ID0gZnVuY3Rpb24gKG5ld19lbGVtcywgdHJhY2ssIHhTY2FsZSkge1xuICAgICAgICBuZXdfZWxlbXMub24oXCJjbGlja1wiLCBkaXNwYXRjaC5jbGljayk7XG4gICAgICAgIG5ld19lbGVtcy5vbihcIm1vdXNlb3ZlclwiLCBkaXNwYXRjaC5tb3VzZW92ZXIpO1xuICAgICAgICBuZXdfZWxlbXMub24oXCJkYmxjbGlja1wiLCBkaXNwYXRjaC5kYmxjbGljayk7XG4gICAgICAgIG5ld19lbGVtcy5vbihcIm1vdXNlb3V0XCIsIGRpc3BhdGNoLm1vdXNlb3V0KTtcbiAgICAgICAgLy8gbmV3X2VsZW0gaXMgYSBnIGVsZW1lbnQgd2hlcmUgdGhlIGZlYXR1cmUgaXMgaW5zZXJ0ZWRcbiAgICAgICAgZXhwb3J0cy5jcmVhdGUuY2FsbCh0cmFjaywgbmV3X2VsZW1zLCB4U2NhbGUpO1xuICAgIH07XG5cbiAgICB2YXIgdXBkYXRlID0gZnVuY3Rpb24gKHhTY2FsZSwgd2hlcmUsIGZpZWxkKSB7XG4gICAgICAgIHZhciB0cmFjayA9IHRoaXM7XG4gICAgICAgIHZhciBzdmdfZyA9IHRyYWNrLmc7XG4gICAgICAgIC8vIHZhciBsYXlvdXQgPSBleHBvcnRzLmxheW91dDtcbiAgICAgICAgLy8gaWYgKGxheW91dC5oZWlnaHQpIHtcbiAgICAgICAgLy8gICAgIGxheW91dC5oZWlnaHQodHJhY2suaGVpZ2h0KCkpO1xuICAgICAgICAvLyB9XG5cbiAgICAgICAgdmFyIGVsZW1lbnRzID0gdHJhY2suZGF0YSgpLmVsZW1lbnRzKCk7XG5cbiAgICAgICAgaWYgKGZpZWxkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGVsZW1lbnRzID0gZWxlbWVudHNbZmllbGRdO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGRhdGFfZWxlbXMgPSBleHBvcnRzLmxheW91dC5jYWxsKHRyYWNrLCBlbGVtZW50cywgeFNjYWxlKTtcblxuICAgICAgICB2YXIgdmlzX3NlbDtcbiAgICAgICAgdmFyIHZpc19lbGVtcztcbiAgICAgICAgaWYgKGZpZWxkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHZpc19zZWwgPSBzdmdfZy5zZWxlY3RBbGwoXCIudG50X2VsZW1fXCIgKyBmaWVsZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2aXNfc2VsID0gc3ZnX2cuc2VsZWN0QWxsKFwiLnRudF9lbGVtXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGV4cG9ydHMuaW5kZXgpIHsgLy8gSW5kZXhpbmcgYnkgZmllbGRcbiAgICAgICAgICAgIHZpc19lbGVtcyA9IHZpc19zZWxcbiAgICAgICAgICAgICAgICAuZGF0YShkYXRhX2VsZW1zLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXhwb3J0cy5pbmRleChkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgeyAvLyBJbmRleGluZyBieSBwb3NpdGlvbiBpbiBhcnJheVxuICAgICAgICAgICAgdmlzX2VsZW1zID0gdmlzX3NlbFxuICAgICAgICAgICAgICAgIC5kYXRhKGRhdGFfZWxlbXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXhwb3J0cy51cGRhdGVyLmNhbGwodHJhY2ssIHZpc19lbGVtcywgeFNjYWxlKTtcblxuICAgIFx0dmFyIG5ld19lbGVtID0gdmlzX2VsZW1zXG4gICAgXHQgICAgLmVudGVyKCk7XG5cbiAgICBcdG5ld19lbGVtXG4gICAgXHQgICAgLmFwcGVuZChcImdcIilcbiAgICBcdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X2VsZW1cIilcbiAgICBcdCAgICAuY2xhc3NlZChcInRudF9lbGVtX1wiICsgZmllbGQsIGZpZWxkKVxuICAgIFx0ICAgIC5jYWxsKGZlYXR1cmUucGxvdCwgdHJhY2ssIHhTY2FsZSk7XG5cbiAgICBcdHZpc19lbGVtc1xuICAgIFx0ICAgIC5leGl0KClcbiAgICBcdCAgICAucmVtb3ZlKCk7XG4gICAgfTtcblxuICAgIHZhciBtb3ZlID0gZnVuY3Rpb24gKHhTY2FsZSwgZmllbGQpIHtcbiAgICBcdHZhciB0cmFjayA9IHRoaXM7XG4gICAgXHR2YXIgc3ZnX2cgPSB0cmFjay5nO1xuICAgIFx0dmFyIGVsZW1zO1xuICAgIFx0Ly8gVE9ETzogSXMgc2VsZWN0aW5nIHRoZSBlbGVtZW50cyB0byBtb3ZlIHRvbyBzbG93P1xuICAgIFx0Ly8gSXQgd291bGQgYmUgbmljZSB0byBwcm9maWxlXG4gICAgXHRpZiAoZmllbGQgIT09IHVuZGVmaW5lZCkge1xuICAgIFx0ICAgIGVsZW1zID0gc3ZnX2cuc2VsZWN0QWxsKFwiLnRudF9lbGVtX1wiICsgZmllbGQpO1xuICAgIFx0fSBlbHNlIHtcbiAgICBcdCAgICBlbGVtcyA9IHN2Z19nLnNlbGVjdEFsbChcIi50bnRfZWxlbVwiKTtcbiAgICBcdH1cblxuICAgIFx0ZXhwb3J0cy5tb3Zlci5jYWxsKHRoaXMsIGVsZW1zLCB4U2NhbGUpO1xuICAgIH07XG5cbiAgICB2YXIgbXRmID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgZWxlbS5wYXJlbnROb2RlLmFwcGVuZENoaWxkKGVsZW0pO1xuICAgIH07XG5cbiAgICB2YXIgbW92ZV90b19mcm9udCA9IGZ1bmN0aW9uIChmaWVsZCkge1xuICAgICAgICBpZiAoZmllbGQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdmFyIHRyYWNrID0gdGhpcztcbiAgICAgICAgICAgIHZhciBzdmdfZyA9IHRyYWNrLmc7XG4gICAgICAgICAgICBzdmdfZy5zZWxlY3RBbGwoXCIudG50X2VsZW1fXCIgKyBmaWVsZClcbiAgICAgICAgICAgICAgICAuZWFjaCggZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBtdGYodGhpcyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gQVBJXG4gICAgYXBpanMgKGZlYXR1cmUpXG4gICAgXHQuZ2V0c2V0IChleHBvcnRzKVxuICAgIFx0Lm1ldGhvZCAoe1xuICAgIFx0ICAgIHJlc2V0ICA6IHJlc2V0LFxuICAgIFx0ICAgIHBsb3QgICA6IHBsb3QsXG4gICAgXHQgICAgdXBkYXRlIDogdXBkYXRlLFxuICAgIFx0ICAgIG1vdmUgICA6IG1vdmUsXG4gICAgXHQgICAgaW5pdCAgIDogaW5pdCxcbiAgICBcdCAgICBtb3ZlX3RvX2Zyb250IDogbW92ZV90b19mcm9udFxuICAgIFx0fSk7XG5cbiAgICByZXR1cm4gZDMucmViaW5kKGZlYXR1cmUsIGRpc3BhdGNoLCBcIm9uXCIpO1xufTtcblxudG50X2ZlYXR1cmUuY29tcG9zaXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBkaXNwbGF5cyA9IHt9O1xuICAgIHZhciBkaXNwbGF5X29yZGVyID0gW107XG5cbiAgICB2YXIgZmVhdHVyZXMgPSB7fTtcblxuICAgIHZhciByZXNldCA9IGZ1bmN0aW9uICgpIHtcbiAgICBcdHZhciB0cmFjayA9IHRoaXM7XG4gICAgXHRmb3IgKHZhciBpPTA7IGk8ZGlzcGxheXMubGVuZ3RoOyBpKyspIHtcbiAgICBcdCAgICBkaXNwbGF5c1tpXS5yZXNldC5jYWxsKHRyYWNrKTtcbiAgICBcdH1cbiAgICB9O1xuXG4gICAgdmFyIGluaXQgPSBmdW5jdGlvbiAod2lkdGgpIHtcbiAgICBcdHZhciB0cmFjayA9IHRoaXM7XG4gICAgIFx0Zm9yICh2YXIgZGlzcGxheSBpbiBkaXNwbGF5cykge1xuICAgIFx0ICAgIGlmIChkaXNwbGF5cy5oYXNPd25Qcm9wZXJ0eShkaXNwbGF5KSkge1xuICAgIFx0XHRkaXNwbGF5c1tkaXNwbGF5XS5pbml0LmNhbGwodHJhY2ssIHdpZHRoKTtcbiAgICBcdCAgICB9XG4gICAgXHR9XG4gICAgfTtcblxuICAgIHZhciB1cGRhdGUgPSBmdW5jdGlvbiAoeFNjYWxlKSB7XG4gICAgXHR2YXIgdHJhY2sgPSB0aGlzO1xuICAgIFx0Zm9yICh2YXIgaT0wOyBpPGRpc3BsYXlfb3JkZXIubGVuZ3RoOyBpKyspIHtcbiAgICBcdCAgICBkaXNwbGF5c1tkaXNwbGF5X29yZGVyW2ldXS51cGRhdGUuY2FsbCh0cmFjaywgeFNjYWxlLCB1bmRlZmluZWQsIGRpc3BsYXlfb3JkZXJbaV0pO1xuICAgIFx0ICAgIGRpc3BsYXlzW2Rpc3BsYXlfb3JkZXJbaV1dLm1vdmVfdG9fZnJvbnQuY2FsbCh0cmFjaywgZGlzcGxheV9vcmRlcltpXSk7XG4gICAgXHR9XG4gICAgXHQvLyBmb3IgKHZhciBkaXNwbGF5IGluIGRpc3BsYXlzKSB7XG4gICAgXHQvLyAgICAgaWYgKGRpc3BsYXlzLmhhc093blByb3BlcnR5KGRpc3BsYXkpKSB7XG4gICAgXHQvLyBcdGRpc3BsYXlzW2Rpc3BsYXldLnVwZGF0ZS5jYWxsKHRyYWNrLCB4U2NhbGUsIGRpc3BsYXkpO1xuICAgIFx0Ly8gICAgIH1cbiAgICBcdC8vIH1cbiAgICB9O1xuXG4gICAgdmFyIG1vdmUgPSBmdW5jdGlvbiAoeFNjYWxlKSB7XG4gICAgXHR2YXIgdHJhY2sgPSB0aGlzO1xuICAgIFx0Zm9yICh2YXIgZGlzcGxheSBpbiBkaXNwbGF5cykge1xuICAgIFx0ICAgIGlmIChkaXNwbGF5cy5oYXNPd25Qcm9wZXJ0eShkaXNwbGF5KSkge1xuICAgIFx0XHRkaXNwbGF5c1tkaXNwbGF5XS5tb3ZlLmNhbGwodHJhY2ssIHhTY2FsZSwgZGlzcGxheSk7XG4gICAgXHQgICAgfVxuICAgIFx0fVxuICAgIH07XG5cbiAgICB2YXIgYWRkID0gZnVuY3Rpb24gKGtleSwgZGlzcGxheSkge1xuICAgIFx0ZGlzcGxheXNba2V5XSA9IGRpc3BsYXk7XG4gICAgXHRkaXNwbGF5X29yZGVyLnB1c2goa2V5KTtcbiAgICBcdHJldHVybiBmZWF0dXJlcztcbiAgICB9O1xuXG4gICAgLy8gdmFyIG9uX2NsaWNrID0gZnVuY3Rpb24gKGNiYWspIHtcbiAgICAvLyAgICAgZm9yICh2YXIgZGlzcGxheSBpbiBkaXNwbGF5cykge1xuICAgIC8vICAgICAgICAgaWYgKGRpc3BsYXlzLmhhc093blByb3BlcnR5KGRpc3BsYXkpKSB7XG4gICAgLy8gICAgICAgICAgICAgZGlzcGxheXNbZGlzcGxheV0ub24oXCJjbGlja1wiLGNiYWspO1xuICAgIC8vICAgICAgICAgfVxuICAgIC8vICAgICB9XG4gICAgLy8gICAgIHJldHVybiBmZWF0dXJlcztcbiAgICAvLyB9O1xuXG4gICAgdmFyIGdldF9kaXNwbGF5cyA9IGZ1bmN0aW9uICgpIHtcbiAgICBcdHZhciBkcyA9IFtdO1xuICAgIFx0Zm9yICh2YXIgaT0wOyBpPGRpc3BsYXlfb3JkZXIubGVuZ3RoOyBpKyspIHtcbiAgICBcdCAgICBkcy5wdXNoKGRpc3BsYXlzW2Rpc3BsYXlfb3JkZXJbaV1dKTtcbiAgICBcdH1cbiAgICBcdHJldHVybiBkcztcbiAgICB9O1xuXG4gICAgLy8gQVBJXG4gICAgYXBpanMgKGZlYXR1cmVzKVxuXHQubWV0aG9kICh7XG5cdCAgICByZXNldCAgOiByZXNldCxcblx0ICAgIHVwZGF0ZSA6IHVwZGF0ZSxcblx0ICAgIG1vdmUgICA6IG1vdmUsXG5cdCAgICBpbml0ICAgOiBpbml0LFxuXHQgICAgYWRkICAgIDogYWRkLFxuXHQgICAgZGlzcGxheXMgOiBnZXRfZGlzcGxheXNcblx0fSk7XG5cbiAgICByZXR1cm4gZmVhdHVyZXM7XG59O1xuXG50bnRfZmVhdHVyZS5hcmVhID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBmZWF0dXJlID0gdG50X2ZlYXR1cmUubGluZSgpO1xuICAgIHZhciBsaW5lID0gdG50X2ZlYXR1cmUubGluZSgpO1xuXG4gICAgdmFyIGFyZWEgPSBkMy5zdmcuYXJlYSgpXG4gICAgXHQuaW50ZXJwb2xhdGUobGluZS5pbnRlcnBvbGF0ZSgpKVxuICAgIFx0LnRlbnNpb24oZmVhdHVyZS50ZW5zaW9uKCkpO1xuXG4gICAgdmFyIGRhdGFfcG9pbnRzO1xuXG4gICAgdmFyIGxpbmVfY3JlYXRlID0gZmVhdHVyZS5jcmVhdGUoKTsgLy8gV2UgJ3NhdmUnIGxpbmUgY3JlYXRpb25cbiAgICBmZWF0dXJlLmNyZWF0ZSAoZnVuY3Rpb24gKHBvaW50cywgeFNjYWxlKSB7XG4gICAgXHR2YXIgdHJhY2sgPSB0aGlzO1xuXG4gICAgXHRpZiAoZGF0YV9wb2ludHMgIT09IHVuZGVmaW5lZCkge1xuICAgIC8vXHQgICAgIHJldHVybjtcbiAgICBcdCAgICB0cmFjay5nLnNlbGVjdChcInBhdGhcIikucmVtb3ZlKCk7XG4gICAgXHR9XG5cbiAgICBcdGxpbmVfY3JlYXRlLmNhbGwodHJhY2ssIHBvaW50cywgeFNjYWxlKTtcblxuICAgIFx0YXJlYVxuICAgIFx0ICAgIC54KGxpbmUueCgpKVxuICAgIFx0ICAgIC55MShsaW5lLnkoKSlcbiAgICBcdCAgICAueTAodHJhY2suaGVpZ2h0KCkpO1xuXG4gICAgXHRkYXRhX3BvaW50cyA9IHBvaW50cy5kYXRhKCk7XG4gICAgXHRwb2ludHMucmVtb3ZlKCk7XG5cbiAgICBcdHRyYWNrLmdcbiAgICBcdCAgICAuYXBwZW5kKFwicGF0aFwiKVxuICAgIFx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfYXJlYVwiKVxuICAgIFx0ICAgIC5jbGFzc2VkKFwidG50X2VsZW1cIiwgdHJ1ZSlcbiAgICBcdCAgICAuZGF0dW0oZGF0YV9wb2ludHMpXG4gICAgXHQgICAgLmF0dHIoXCJkXCIsIGFyZWEpXG4gICAgXHQgICAgLmF0dHIoXCJmaWxsXCIsIGQzLnJnYihmZWF0dXJlLmZvcmVncm91bmRfY29sb3IoKSkuYnJpZ2h0ZXIoKSk7XG4gICAgfSk7XG5cbiAgICB2YXIgbGluZV9tb3ZlciA9IGZlYXR1cmUubW92ZXIoKTtcbiAgICBmZWF0dXJlLm1vdmVyIChmdW5jdGlvbiAocGF0aCwgeFNjYWxlKSB7XG4gICAgXHR2YXIgdHJhY2sgPSB0aGlzO1xuICAgIFx0bGluZV9tb3Zlci5jYWxsKHRyYWNrLCBwYXRoLCB4U2NhbGUpO1xuXG4gICAgXHRhcmVhLngobGluZS54KCkpO1xuICAgIFx0dHJhY2suZ1xuICAgIFx0ICAgIC5zZWxlY3QoXCIudG50X2FyZWFcIilcbiAgICBcdCAgICAuZGF0dW0oZGF0YV9wb2ludHMpXG4gICAgXHQgICAgLmF0dHIoXCJkXCIsIGFyZWEpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG5cbn07XG5cbnRudF9mZWF0dXJlLmxpbmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGZlYXR1cmUgPSB0bnRfZmVhdHVyZSgpO1xuXG4gICAgdmFyIHggPSBmdW5jdGlvbiAoZCkge1xuICAgICAgICByZXR1cm4gZC5wb3M7XG4gICAgfTtcbiAgICB2YXIgeSA9IGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIHJldHVybiBkLnZhbDtcbiAgICB9O1xuICAgIHZhciB0ZW5zaW9uID0gMC43O1xuICAgIHZhciB5U2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKTtcbiAgICB2YXIgbGluZSA9IGQzLnN2Zy5saW5lKClcbiAgICAgICAgLmludGVycG9sYXRlKFwiYmFzaXNcIik7XG5cbiAgICAvLyBsaW5lIGdldHRlci4gVE9ETzogU2V0dGVyP1xuICAgIGZlYXR1cmUubGluZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGxpbmU7XG4gICAgfTtcblxuICAgIGZlYXR1cmUueCA9IGZ1bmN0aW9uIChjYmFrKSB7XG4gICAgXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICBcdCAgICByZXR1cm4geDtcbiAgICBcdH1cbiAgICBcdHggPSBjYmFrO1xuICAgIFx0cmV0dXJuIGZlYXR1cmU7XG4gICAgfTtcblxuICAgIGZlYXR1cmUueSA9IGZ1bmN0aW9uIChjYmFrKSB7XG4gICAgXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICBcdCAgICByZXR1cm4geTtcbiAgICBcdH1cbiAgICBcdHkgPSBjYmFrO1xuICAgIFx0cmV0dXJuIGZlYXR1cmU7XG4gICAgfTtcblxuICAgIGZlYXR1cmUudGVuc2lvbiA9IGZ1bmN0aW9uICh0KSB7XG4gICAgXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICBcdCAgICByZXR1cm4gdGVuc2lvbjtcbiAgICBcdH1cbiAgICBcdHRlbnNpb24gPSB0O1xuICAgIFx0cmV0dXJuIGZlYXR1cmU7XG4gICAgfTtcblxuICAgIHZhciBkYXRhX3BvaW50cztcblxuICAgIC8vIEZvciBub3csIGNyZWF0ZSBpcyBhIG9uZS1vZmYgZXZlbnRcbiAgICAvLyBUT0RPOiBNYWtlIGl0IHdvcmsgd2l0aCBwYXJ0aWFsIHBhdGhzLCBpZS4gY3JlYXRpbmcgYW5kIGRpc3BsYXlpbmcgb25seSB0aGUgcGF0aCB0aGF0IGlzIGJlaW5nIGRpc3BsYXllZFxuICAgIGZlYXR1cmUuY3JlYXRlIChmdW5jdGlvbiAocG9pbnRzLCB4U2NhbGUpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblxuXHRpZiAoZGF0YV9wb2ludHMgIT09IHVuZGVmaW5lZCkge1xuXHQgICAgLy8gcmV0dXJuO1xuXHQgICAgdHJhY2suZy5zZWxlY3QoXCJwYXRoXCIpLnJlbW92ZSgpO1xuXHR9XG5cblx0bGluZVxuXHQgICAgLnRlbnNpb24odGVuc2lvbilcblx0ICAgIC54KGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICByZXR1cm4geFNjYWxlKHgoZCkpO1xuXHQgICAgfSlcblx0ICAgIC55KGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJhY2suaGVpZ2h0KCkgLSB5U2NhbGUoeShkKSk7XG5cdCAgICB9KTtcblxuXHRkYXRhX3BvaW50cyA9IHBvaW50cy5kYXRhKCk7XG5cdHBvaW50cy5yZW1vdmUoKTtcblxuXHR5U2NhbGVcblx0ICAgIC5kb21haW4oWzAsIDFdKVxuXHQgICAgLy8gLmRvbWFpbihbMCwgZDMubWF4KGRhdGFfcG9pbnRzLCBmdW5jdGlvbiAoZCkge1xuXHQgICAgLy8gXHRyZXR1cm4geShkKTtcblx0ICAgIC8vIH0pXSlcblx0ICAgIC5yYW5nZShbMCwgdHJhY2suaGVpZ2h0KCkgLSAyXSk7XG5cblx0dHJhY2suZ1xuXHQgICAgLmFwcGVuZChcInBhdGhcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfZWxlbVwiKVxuXHQgICAgLmF0dHIoXCJkXCIsIGxpbmUoZGF0YV9wb2ludHMpKVxuXHQgICAgLnN0eWxlKFwic3Ryb2tlXCIsIGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpKVxuXHQgICAgLnN0eWxlKFwic3Ryb2tlLXdpZHRoXCIsIDQpXG5cdCAgICAuc3R5bGUoXCJmaWxsXCIsIFwibm9uZVwiKTtcblxuICAgIH0pO1xuXG4gICAgZmVhdHVyZS5tb3ZlciAoZnVuY3Rpb24gKHBhdGgsIHhTY2FsZSkge1xuICAgIFx0dmFyIHRyYWNrID0gdGhpcztcblxuICAgIFx0bGluZS54KGZ1bmN0aW9uIChkKSB7XG4gICAgXHQgICAgcmV0dXJuIHhTY2FsZSh4KGQpKVxuICAgIFx0fSk7XG4gICAgXHR0cmFjay5nLnNlbGVjdChcInBhdGhcIilcbiAgICBcdCAgICAuYXR0cihcImRcIiwgbGluZShkYXRhX3BvaW50cykpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG59O1xuXG50bnRfZmVhdHVyZS5jb25zZXJ2YXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vICdJbmhlcml0JyBmcm9tIGZlYXR1cmUuYXJlYVxuICAgICAgICB2YXIgZmVhdHVyZSA9IHRudF9mZWF0dXJlLmFyZWEoKTtcblxuICAgICAgICB2YXIgYXJlYV9jcmVhdGUgPSBmZWF0dXJlLmNyZWF0ZSgpOyAvLyBXZSAnc2F2ZScgYXJlYSBjcmVhdGlvblxuICAgICAgICBmZWF0dXJlLmNyZWF0ZSAgKGZ1bmN0aW9uIChwb2ludHMsIHhTY2FsZSkge1xuICAgIFx0dmFyIHRyYWNrID0gdGhpcztcblxuICAgIFx0YXJlYV9jcmVhdGUuY2FsbCh0cmFjaywgZDMuc2VsZWN0KHBvaW50c1swXVswXSksIHhTY2FsZSk7XG4gICAgICAgIH0pO1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG59O1xuXG50bnRfZmVhdHVyZS5lbnNlbWJsID0gZnVuY3Rpb24gKCkge1xuICAgIC8vICdJbmhlcml0JyBmcm9tIGJvYXJkLnRyYWNrLmZlYXR1cmVcbiAgICB2YXIgZmVhdHVyZSA9IHRudF9mZWF0dXJlKCk7XG5cbiAgICB2YXIgZm9yZWdyb3VuZF9jb2xvcjIgPSBcIiM3RkZGMDBcIjtcbiAgICB2YXIgZm9yZWdyb3VuZF9jb2xvcjMgPSBcIiMwMEJCMDBcIjtcblxuICAgIGZlYXR1cmUuZ3VpZGVyIChmdW5jdGlvbiAod2lkdGgpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblx0dmFyIGhlaWdodF9vZmZzZXQgPSB+fih0cmFjay5oZWlnaHQoKSAtICh0cmFjay5oZWlnaHQoKSAgKiAwLjgpKSAvIDI7XG5cblx0dHJhY2suZ1xuXHQgICAgLmFwcGVuZChcImxpbmVcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfZ3VpZGVyXCIpXG5cdCAgICAuYXR0cihcIngxXCIsIDApXG5cdCAgICAuYXR0cihcIngyXCIsIHdpZHRoKVxuXHQgICAgLmF0dHIoXCJ5MVwiLCBoZWlnaHRfb2Zmc2V0KVxuXHQgICAgLmF0dHIoXCJ5MlwiLCBoZWlnaHRfb2Zmc2V0KVxuXHQgICAgLnN0eWxlKFwic3Ryb2tlXCIsIGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpKVxuXHQgICAgLnN0eWxlKFwic3Ryb2tlLXdpZHRoXCIsIDEpO1xuXG5cdHRyYWNrLmdcblx0ICAgIC5hcHBlbmQoXCJsaW5lXCIpXG5cdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X2d1aWRlclwiKVxuXHQgICAgLmF0dHIoXCJ4MVwiLCAwKVxuXHQgICAgLmF0dHIoXCJ4MlwiLCB3aWR0aClcblx0ICAgIC5hdHRyKFwieTFcIiwgdHJhY2suaGVpZ2h0KCkgLSBoZWlnaHRfb2Zmc2V0KVxuXHQgICAgLmF0dHIoXCJ5MlwiLCB0cmFjay5oZWlnaHQoKSAtIGhlaWdodF9vZmZzZXQpXG5cdCAgICAuc3R5bGUoXCJzdHJva2VcIiwgZmVhdHVyZS5mb3JlZ3JvdW5kX2NvbG9yKCkpXG5cdCAgICAuc3R5bGUoXCJzdHJva2Utd2lkdGhcIiwgMSk7XG5cbiAgICB9KTtcblxuICAgIGZlYXR1cmUuY3JlYXRlIChmdW5jdGlvbiAobmV3X2VsZW1zLCB4U2NhbGUpIHtcblx0dmFyIHRyYWNrID0gdGhpcztcblxuXHR2YXIgaGVpZ2h0X29mZnNldCA9IH5+KHRyYWNrLmhlaWdodCgpIC0gKHRyYWNrLmhlaWdodCgpICAqIDAuOCkpIC8gMjtcblxuXHRuZXdfZWxlbXNcblx0ICAgIC5hcHBlbmQoXCJyZWN0XCIpXG5cdCAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgIHJldHVybiB4U2NhbGUgKGQuc3RhcnQpO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwieVwiLCBoZWlnaHRfb2Zmc2V0KVxuLy8gXHQgICAgLmF0dHIoXCJyeFwiLCAzKVxuLy8gXHQgICAgLmF0dHIoXCJyeVwiLCAzKVxuXHQgICAgLmF0dHIoXCJ3aWR0aFwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgcmV0dXJuICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcImhlaWdodFwiLCB0cmFjay5oZWlnaHQoKSAtIH5+KGhlaWdodF9vZmZzZXQgKiAyKSlcblx0ICAgIC5hdHRyKFwiZmlsbFwiLCB0cmFjay5iYWNrZ3JvdW5kX2NvbG9yKCkpXG5cdCAgICAudHJhbnNpdGlvbigpXG5cdCAgICAuZHVyYXRpb24oNTAwKVxuXHQgICAgLmF0dHIoXCJmaWxsXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgXHRcdGlmIChkLnR5cGUgPT09ICdoaWdoJykge1xuICAgIFx0XHQgICAgcmV0dXJuIGQzLnJnYihmZWF0dXJlLmZvcmVncm91bmRfY29sb3IoKSk7XG4gICAgXHRcdH1cbiAgICBcdFx0aWYgKGQudHlwZSA9PT0gJ2xvdycpIHtcbiAgICBcdFx0ICAgIHJldHVybiBkMy5yZ2IoZmVhdHVyZS5mb3JlZ3JvdW5kX2NvbG9yMigpKTtcbiAgICBcdFx0fVxuICAgIFx0XHRyZXR1cm4gZDMucmdiKGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcjMoKSk7XG5cdCAgICB9KTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUudXBkYXRlciAoZnVuY3Rpb24gKGJsb2NrcywgeFNjYWxlKSB7XG5cdGJsb2Nrc1xuXHQgICAgLnNlbGVjdChcInJlY3RcIilcblx0ICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgIHJldHVybiAoeFNjYWxlKGQuZW5kKSAtIHhTY2FsZShkLnN0YXJ0KSk7XG5cdCAgICB9KTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUubW92ZXIgKGZ1bmN0aW9uIChibG9ja3MsIHhTY2FsZSkge1xuXHRibG9ja3Ncblx0ICAgIC5zZWxlY3QoXCJyZWN0XCIpXG5cdCAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgIHJldHVybiB4U2NhbGUoZC5zdGFydCk7XG5cdCAgICB9KVxuXHQgICAgLmF0dHIoXCJ3aWR0aFwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgcmV0dXJuICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKTtcblx0ICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZmVhdHVyZS5mb3JlZ3JvdW5kX2NvbG9yMiA9IGZ1bmN0aW9uIChjb2wpIHtcbiAgICBcdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIFx0ICAgIHJldHVybiBmb3JlZ3JvdW5kX2NvbG9yMjtcbiAgICBcdH1cbiAgICBcdGZvcmVncm91bmRfY29sb3IyID0gY29sO1xuICAgIFx0cmV0dXJuIGZlYXR1cmU7XG4gICAgfTtcblxuICAgIGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcjMgPSBmdW5jdGlvbiAoY29sKSB7XG4gICAgXHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICBcdCAgICByZXR1cm4gZm9yZWdyb3VuZF9jb2xvcjM7XG4gICAgXHR9XG4gICAgXHRmb3JlZ3JvdW5kX2NvbG9yMyA9IGNvbDtcbiAgICBcdHJldHVybiBmZWF0dXJlO1xuICAgIH07XG5cbiAgICByZXR1cm4gZmVhdHVyZTtcbn07XG5cbnRudF9mZWF0dXJlLnZsaW5lID0gZnVuY3Rpb24gKCkge1xuICAgIC8vICdJbmhlcml0JyBmcm9tIGZlYXR1cmVcbiAgICB2YXIgZmVhdHVyZSA9IHRudF9mZWF0dXJlKCk7XG5cbiAgICBmZWF0dXJlLmNyZWF0ZSAoZnVuY3Rpb24gKG5ld19lbGVtcywgeFNjYWxlKSB7XG4gICAgXHR2YXIgdHJhY2sgPSB0aGlzO1xuICAgIFx0bmV3X2VsZW1zXG4gICAgXHQgICAgLmFwcGVuZCAoXCJsaW5lXCIpXG4gICAgXHQgICAgLmF0dHIoXCJ4MVwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIC8vIFRPRE86IFNob3VsZCB1c2UgdGhlIGluZGV4IHZhbHVlP1xuICAgICAgICAgICAgICAgIHJldHVybiB4U2NhbGUoZmVhdHVyZS5pbmRleCgpKGQpKTtcbiAgICBcdCAgICB9KVxuICAgIFx0ICAgIC5hdHRyKFwieDJcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geFNjYWxlKGZlYXR1cmUuaW5kZXgoKShkKSk7XG4gICAgXHQgICAgfSlcbiAgICBcdCAgICAuYXR0cihcInkxXCIsIDApXG4gICAgXHQgICAgLmF0dHIoXCJ5MlwiLCB0cmFjay5oZWlnaHQoKSlcbiAgICBcdCAgICAuYXR0cihcInN0cm9rZVwiLCBmZWF0dXJlLmZvcmVncm91bmRfY29sb3IoKSlcbiAgICBcdCAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLCAxKTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUubW92ZXIgKGZ1bmN0aW9uICh2bGluZXMsIHhTY2FsZSkge1xuICAgIFx0dmxpbmVzXG4gICAgXHQgICAgLnNlbGVjdChcImxpbmVcIilcbiAgICBcdCAgICAuYXR0cihcIngxXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHhTY2FsZShmZWF0dXJlLmluZGV4KCkoZCkpO1xuICAgIFx0ICAgIH0pXG4gICAgXHQgICAgLmF0dHIoXCJ4MlwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4U2NhbGUoZmVhdHVyZS5pbmRleCgpKGQpKTtcbiAgICBcdCAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBmZWF0dXJlO1xuXG59O1xuXG50bnRfZmVhdHVyZS5waW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gJ0luaGVyaXQnIGZyb20gYm9hcmQudHJhY2suZmVhdHVyZVxuICAgIHZhciBmZWF0dXJlID0gdG50X2ZlYXR1cmUoKTtcblxuICAgIHZhciB5U2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgIFx0LmRvbWFpbihbMCwwXSlcbiAgICBcdC5yYW5nZShbMCwwXSk7XG5cbiAgICB2YXIgb3B0cyA9IHtcbiAgICAgICAgcG9zIDogZDMuZnVuY3RvcihcInBvc1wiKSxcbiAgICAgICAgdmFsIDogZDMuZnVuY3RvcihcInZhbFwiKSxcbiAgICAgICAgZG9tYWluIDogWzAsMF1cbiAgICB9O1xuXG4gICAgdmFyIHBpbl9iYWxsX3IgPSA1OyAvLyB0aGUgcmFkaXVzIG9mIHRoZSBjaXJjbGUgaW4gdGhlIHBpblxuXG4gICAgYXBpanMoZmVhdHVyZSlcbiAgICAgICAgLmdldHNldChvcHRzKTtcblxuXG4gICAgZmVhdHVyZS5jcmVhdGUgKGZ1bmN0aW9uIChuZXdfcGlucywgeFNjYWxlKSB7XG4gICAgXHR2YXIgdHJhY2sgPSB0aGlzO1xuICAgIFx0eVNjYWxlXG4gICAgXHQgICAgLmRvbWFpbihmZWF0dXJlLmRvbWFpbigpKVxuICAgIFx0ICAgIC5yYW5nZShbcGluX2JhbGxfciwgdHJhY2suaGVpZ2h0KCktcGluX2JhbGxfci0xMF0pOyAvLyAxMCBmb3IgbGFiZWxsaW5nXG5cbiAgICBcdC8vIHBpbnMgYXJlIGNvbXBvc2VkIG9mIGxpbmVzLCBjaXJjbGVzIGFuZCBsYWJlbHNcbiAgICBcdG5ld19waW5zXG4gICAgXHQgICAgLmFwcGVuZChcImxpbmVcIilcbiAgICBcdCAgICAuYXR0cihcIngxXCIsIGZ1bmN0aW9uIChkLCBpKSB7XG4gICAgXHQgICAgXHRyZXR1cm4geFNjYWxlKGRbb3B0cy5wb3MoZCwgaSldKTtcbiAgICBcdCAgICB9KVxuICAgIFx0ICAgIC5hdHRyKFwieTFcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJhY2suaGVpZ2h0KCk7XG4gICAgXHQgICAgfSlcbiAgICBcdCAgICAuYXR0cihcIngyXCIsIGZ1bmN0aW9uIChkLGkpIHtcbiAgICBcdCAgICBcdHJldHVybiB4U2NhbGUoZFtvcHRzLnBvcyhkLCBpKV0pO1xuICAgIFx0ICAgIH0pXG4gICAgXHQgICAgLmF0dHIoXCJ5MlwiLCBmdW5jdGlvbiAoZCwgaSkge1xuICAgIFx0ICAgIFx0cmV0dXJuIHRyYWNrLmhlaWdodCgpIC0geVNjYWxlKGRbb3B0cy52YWwoZCwgaSldKTtcbiAgICBcdCAgICB9KVxuICAgIFx0ICAgIC5hdHRyKFwic3Ryb2tlXCIsIGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpKTtcblxuICAgIFx0bmV3X3BpbnNcbiAgICBcdCAgICAuYXBwZW5kKFwiY2lyY2xlXCIpXG4gICAgXHQgICAgLmF0dHIoXCJjeFwiLCBmdW5jdGlvbiAoZCwgaSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4U2NhbGUoZFtvcHRzLnBvcyhkLCBpKV0pO1xuICAgIFx0ICAgIH0pXG4gICAgXHQgICAgLmF0dHIoXCJjeVwiLCBmdW5jdGlvbiAoZCwgaSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cmFjay5oZWlnaHQoKSAtIHlTY2FsZShkW29wdHMudmFsKGQsIGkpXSk7XG4gICAgXHQgICAgfSlcbiAgICBcdCAgICAuYXR0cihcInJcIiwgcGluX2JhbGxfcilcbiAgICBcdCAgICAuYXR0cihcImZpbGxcIiwgZmVhdHVyZS5mb3JlZ3JvdW5kX2NvbG9yKCkpO1xuXG4gICAgICAgIG5ld19waW5zXG4gICAgICAgICAgICAuYXBwZW5kKFwidGV4dFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJmb250LXNpemVcIiwgXCIxM1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkLCBpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHhTY2FsZShkW29wdHMucG9zKGQsIGkpXSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIGZ1bmN0aW9uIChkLCBpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDEwO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpXG4gICAgICAgICAgICAudGV4dChmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBkLmxhYmVsIHx8IFwiXCI7XG4gICAgICAgICAgICB9KTtcblxuICAgIH0pO1xuXG4gICAgZmVhdHVyZS51cGRhdGVyIChmdW5jdGlvbiAocGlucywgeFNjYWxlKXtcbiAgICAgICAgcGluc1xuICAgICAgICAgICAgLnNlbGVjdChcInRleHRcIilcbiAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGQubGFiZWwgfHwgXCJcIjtcbiAgICAgICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZmVhdHVyZS5tb3ZlcihmdW5jdGlvbiAocGlucywgeFNjYWxlKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cdHBpbnNcblx0ICAgIC8vLmVhY2gocG9zaXRpb25fcGluX2xpbmUpXG5cdCAgICAuc2VsZWN0KFwibGluZVwiKVxuXHQgICAgLmF0dHIoXCJ4MVwiLCBmdW5jdGlvbiAoZCwgaSkge1xuICAgICAgICAgICAgcmV0dXJuIHhTY2FsZShkW29wdHMucG9zKGQsIGkpXSk7XG5cdCAgICB9KVxuXHQgICAgLmF0dHIoXCJ5MVwiLCBmdW5jdGlvbiAoZCkge1xuICAgIFx0XHRyZXR1cm4gdHJhY2suaGVpZ2h0KCk7XG5cdCAgICB9KVxuXHQgICAgLmF0dHIoXCJ4MlwiLCBmdW5jdGlvbiAoZCxpKSB7XG4gICAgXHRcdHJldHVybiB4U2NhbGUoZFtvcHRzLnBvcyhkLCBpKV0pO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwieTJcIiwgZnVuY3Rpb24gKGQsIGkpIHtcbiAgICBcdFx0cmV0dXJuIHRyYWNrLmhlaWdodCgpIC0geVNjYWxlKGRbb3B0cy52YWwoZCwgaSldKTtcblx0ICAgIH0pO1xuXG5cdHBpbnNcblx0ICAgIC5zZWxlY3QoXCJjaXJjbGVcIilcblx0ICAgIC5hdHRyKFwiY3hcIiwgZnVuY3Rpb24gKGQsIGkpIHtcbiAgICAgICAgICAgIHJldHVybiB4U2NhbGUoZFtvcHRzLnBvcyhkLCBpKV0pO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwiY3lcIiwgZnVuY3Rpb24gKGQsIGkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cmFjay5oZWlnaHQoKSAtIHlTY2FsZShkW29wdHMudmFsKGQsIGkpXSk7XG5cdCAgICB9KTtcblxuICAgIHBpbnNcbiAgICAgICAgLnNlbGVjdChcInRleHRcIilcbiAgICAgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkLCBpKSB7XG4gICAgICAgICAgICByZXR1cm4geFNjYWxlKGRbb3B0cy5wb3MoZCwgaSldKTtcbiAgICAgICAgfSlcbiAgICAgICAgLnRleHQoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgIHJldHVybiBkLmxhYmVsIHx8IFwiXCI7XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLmd1aWRlciAoZnVuY3Rpb24gKHdpZHRoKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cdHRyYWNrLmdcblx0ICAgIC5hcHBlbmQoXCJsaW5lXCIpXG5cdCAgICAuYXR0cihcIngxXCIsIDApXG5cdCAgICAuYXR0cihcIngyXCIsIHdpZHRoKVxuXHQgICAgLmF0dHIoXCJ5MVwiLCB0cmFjay5oZWlnaHQoKSlcblx0ICAgIC5hdHRyKFwieTJcIiwgdHJhY2suaGVpZ2h0KCkpXG5cdCAgICAuc3R5bGUoXCJzdHJva2VcIiwgXCJibGFja1wiKVxuXHQgICAgLnN0eWxlKFwic3Ryb2tlLXdpdGhcIiwgXCIxcHhcIik7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZmVhdHVyZTtcbn07XG5cbnRudF9mZWF0dXJlLmJsb2NrID0gZnVuY3Rpb24gKCkge1xuICAgIC8vICdJbmhlcml0JyBmcm9tIGJvYXJkLnRyYWNrLmZlYXR1cmVcbiAgICB2YXIgZmVhdHVyZSA9IHRudF9mZWF0dXJlKCk7XG5cbiAgICBhcGlqcyhmZWF0dXJlKVxuICAgIFx0LmdldHNldCgnZnJvbScsIGZ1bmN0aW9uIChkKSB7XG4gICAgXHQgICAgcmV0dXJuIGQuc3RhcnQ7XG4gICAgXHR9KVxuICAgIFx0LmdldHNldCgndG8nLCBmdW5jdGlvbiAoZCkge1xuICAgIFx0ICAgIHJldHVybiBkLmVuZDtcbiAgICBcdH0pO1xuXG4gICAgZmVhdHVyZS5jcmVhdGUoZnVuY3Rpb24gKG5ld19lbGVtcywgeFNjYWxlKSB7XG4gICAgXHR2YXIgdHJhY2sgPSB0aGlzO1xuICAgIFx0bmV3X2VsZW1zXG4gICAgXHQgICAgLmFwcGVuZChcInJlY3RcIilcbiAgICBcdCAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQsIGkpIHtcbiAgICAgICAgXHRcdC8vIFRPRE86IHN0YXJ0LCBlbmQgc2hvdWxkIGJlIGFkanVzdGFibGUgdmlhIHRoZSB0cmFja3MgQVBJXG4gICAgICAgIFx0XHRyZXR1cm4geFNjYWxlKGZlYXR1cmUuZnJvbSgpKGQsIGkpKTtcbiAgICBcdCAgICB9KVxuICAgIFx0ICAgIC5hdHRyKFwieVwiLCAwKVxuICAgIFx0ICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24gKGQsIGkpIHtcbiAgICAgICAgXHRcdHJldHVybiAoeFNjYWxlKGZlYXR1cmUudG8oKShkLCBpKSkgLSB4U2NhbGUoZmVhdHVyZS5mcm9tKCkoZCwgaSkpKTtcbiAgICBcdCAgICB9KVxuICAgIFx0ICAgIC5hdHRyKFwiaGVpZ2h0XCIsIHRyYWNrLmhlaWdodCgpKVxuICAgIFx0ICAgIC5hdHRyKFwiZmlsbFwiLCB0cmFjay5iYWNrZ3JvdW5kX2NvbG9yKCkpXG4gICAgXHQgICAgLnRyYW5zaXRpb24oKVxuICAgIFx0ICAgIC5kdXJhdGlvbig1MDApXG4gICAgXHQgICAgLmF0dHIoXCJmaWxsXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIFx0XHRpZiAoZC5jb2xvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIFx0XHQgICAgcmV0dXJuIGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpO1xuICAgICAgICBcdFx0fSBlbHNlIHtcbiAgICAgICAgXHRcdCAgICByZXR1cm4gZC5jb2xvcjtcbiAgICAgICAgXHRcdH1cbiAgICBcdCAgICB9KTtcbiAgICB9KTtcblxuICAgIGZlYXR1cmUudXBkYXRlcihmdW5jdGlvbiAoZWxlbXMsIHhTY2FsZSkge1xuICAgIFx0ZWxlbXNcbiAgICBcdCAgICAuc2VsZWN0KFwicmVjdFwiKVxuICAgIFx0ICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgXHRcdHJldHVybiAoeFNjYWxlKGQuZW5kKSAtIHhTY2FsZShkLnN0YXJ0KSk7XG4gICAgXHQgICAgfSk7XG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLm1vdmVyKGZ1bmN0aW9uIChibG9ja3MsIHhTY2FsZSkge1xuICAgIFx0YmxvY2tzXG4gICAgXHQgICAgLnNlbGVjdChcInJlY3RcIilcbiAgICBcdCAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgXHRcdHJldHVybiB4U2NhbGUoZC5zdGFydCk7XG4gICAgXHQgICAgfSlcbiAgICBcdCAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIFx0XHRyZXR1cm4gKHhTY2FsZShkLmVuZCkgLSB4U2NhbGUoZC5zdGFydCkpO1xuICAgIFx0ICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG5cbn07XG5cbnRudF9mZWF0dXJlLmF4aXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHhBeGlzO1xuICAgIHZhciBvcmllbnRhdGlvbiA9IFwidG9wXCI7XG5cbiAgICAvLyBBeGlzIGRvZXNuJ3QgaW5oZXJpdCBmcm9tIGZlYXR1cmVcbiAgICB2YXIgZmVhdHVyZSA9IHt9O1xuICAgIGZlYXR1cmUucmVzZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgXHR4QXhpcyA9IHVuZGVmaW5lZDtcbiAgICBcdHZhciB0cmFjayA9IHRoaXM7XG4gICAgXHR0cmFjay5nLnNlbGVjdEFsbChcInJlY3RcIikucmVtb3ZlKCk7XG4gICAgXHR0cmFjay5nLnNlbGVjdEFsbChcIi50aWNrXCIpLnJlbW92ZSgpO1xuICAgIH07XG4gICAgZmVhdHVyZS5wbG90ID0gZnVuY3Rpb24gKCkge307XG4gICAgZmVhdHVyZS5tb3ZlID0gZnVuY3Rpb24gKCkge1xuICAgIFx0dmFyIHRyYWNrID0gdGhpcztcbiAgICBcdHZhciBzdmdfZyA9IHRyYWNrLmc7XG4gICAgXHRzdmdfZy5jYWxsKHhBeGlzKTtcbiAgICB9O1xuXG4gICAgZmVhdHVyZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB4QXhpcyA9IHVuZGVmaW5lZDtcbiAgICB9O1xuXG4gICAgZmVhdHVyZS51cGRhdGUgPSBmdW5jdGlvbiAoeFNjYWxlKSB7XG4gICAgXHQvLyBDcmVhdGUgQXhpcyBpZiBpdCBkb2Vzbid0IGV4aXN0XG4gICAgXHRpZiAoeEF4aXMgPT09IHVuZGVmaW5lZCkge1xuICAgIFx0ICAgIHhBeGlzID0gZDMuc3ZnLmF4aXMoKVxuICAgIFx0XHQuc2NhbGUoeFNjYWxlKVxuICAgIFx0XHQub3JpZW50KG9yaWVudGF0aW9uKTtcbiAgICBcdH1cblxuICAgIFx0dmFyIHRyYWNrID0gdGhpcztcbiAgICBcdHZhciBzdmdfZyA9IHRyYWNrLmc7XG4gICAgXHRzdmdfZy5jYWxsKHhBeGlzKTtcbiAgICB9O1xuXG4gICAgZmVhdHVyZS5vcmllbnRhdGlvbiA9IGZ1bmN0aW9uIChwb3MpIHtcbiAgICBcdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIFx0ICAgIHJldHVybiBvcmllbnRhdGlvbjtcbiAgICBcdH1cbiAgICBcdG9yaWVudGF0aW9uID0gcG9zO1xuICAgIFx0cmV0dXJuIGZlYXR1cmU7XG4gICAgfTtcblxuICAgIHJldHVybiBmZWF0dXJlO1xufTtcblxudG50X2ZlYXR1cmUubG9jYXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJvdztcblxuICAgIHZhciBmZWF0dXJlID0ge307XG4gICAgZmVhdHVyZS5yZXNldCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcm93ID0gdW5kZWZpbmVkO1xuICAgIH07XG4gICAgZmVhdHVyZS5wbG90ID0gZnVuY3Rpb24gKCkge307XG4gICAgZmVhdHVyZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByb3cgPSB1bmRlZmluZWQ7XG4gICAgfTtcbiAgICBmZWF0dXJlLm1vdmUgPSBmdW5jdGlvbih4U2NhbGUpIHtcbiAgICBcdHZhciBkb21haW4gPSB4U2NhbGUuZG9tYWluKCk7XG4gICAgXHRyb3cuc2VsZWN0KFwidGV4dFwiKVxuICAgIFx0ICAgIC50ZXh0KFwiTG9jYXRpb246IFwiICsgfn5kb21haW5bMF0gKyBcIi1cIiArIH5+ZG9tYWluWzFdKTtcbiAgICB9O1xuXG4gICAgZmVhdHVyZS51cGRhdGUgPSBmdW5jdGlvbiAoeFNjYWxlKSB7XG4gICAgXHR2YXIgdHJhY2sgPSB0aGlzO1xuICAgIFx0dmFyIHN2Z19nID0gdHJhY2suZztcbiAgICBcdHZhciBkb21haW4gPSB4U2NhbGUuZG9tYWluKCk7XG4gICAgXHRpZiAocm93ID09PSB1bmRlZmluZWQpIHtcbiAgICBcdCAgICByb3cgPSBzdmdfZztcbiAgICBcdCAgICByb3dcbiAgICAgICAgXHRcdC5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAgIFx0XHQudGV4dChcIkxvY2F0aW9uOiBcIiArIH5+ZG9tYWluWzBdICsgXCItXCIgKyB+fmRvbWFpblsxXSk7XG4gICAgXHR9XG4gICAgfTtcblxuICAgIHJldHVybiBmZWF0dXJlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gdG50X2ZlYXR1cmU7XG4iLCJ2YXIgYm9hcmQgPSByZXF1aXJlIChcIi4vYm9hcmQuanNcIik7XG5ib2FyZC50cmFjayA9IHJlcXVpcmUgKFwiLi90cmFja1wiKTtcbmJvYXJkLnRyYWNrLmRhdGEgPSByZXF1aXJlIChcIi4vZGF0YS5qc1wiKTtcbmJvYXJkLnRyYWNrLmxheW91dCA9IHJlcXVpcmUgKFwiLi9sYXlvdXQuanNcIik7XG5ib2FyZC50cmFjay5mZWF0dXJlID0gcmVxdWlyZSAoXCIuL2ZlYXR1cmUuanNcIik7XG5ib2FyZC50cmFjay5sYXlvdXQgPSByZXF1aXJlIChcIi4vbGF5b3V0LmpzXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBib2FyZDtcbiIsInZhciBhcGlqcyA9IHJlcXVpcmUgKFwidG50LmFwaVwiKTtcblxuLy8gdmFyIGJvYXJkID0ge307XG4vLyBib2FyZC50cmFjayA9IHt9O1xudmFyIGxheW91dCA9IGZ1bmN0aW9uICgpIHtcblxuICAgIC8vIFRoZSByZXR1cm5lZCBjbG9zdXJlIC8gb2JqZWN0XG4gICAgdmFyIGwgPSBmdW5jdGlvbiAobmV3X2VsZW1zLCB4U2NhbGUpICB7XG4gICAgICAgIHZhciB0cmFjayA9IHRoaXM7XG4gICAgICAgIGwuZWxlbWVudHMoKS5jYWxsKHRyYWNrLCBuZXdfZWxlbXMsIHhTY2FsZSk7XG4gICAgICAgIHJldHVybiBuZXdfZWxlbXM7XG4gICAgfTtcblxuICAgIHZhciBhcGkgPSBhcGlqcyhsKVxuICAgICAgICAuZ2V0c2V0ICgnZWxlbWVudHMnLCBmdW5jdGlvbiAoKSB7fSk7XG5cbiAgICByZXR1cm4gbDtcbn07XG5cbmxheW91dC5pZGVudGl0eSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbGF5b3V0KClcbiAgICAgICAgLmVsZW1lbnRzIChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgcmV0dXJuIGU7XG4gICAgICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gbGF5b3V0O1xuIiwidmFyIGFwaWpzID0gcmVxdWlyZSAoXCJ0bnQuYXBpXCIpO1xudmFyIGl0ZXJhdG9yID0gcmVxdWlyZShcInRudC51dGlsc1wiKS5pdGVyYXRvcjtcblxuLy92YXIgYm9hcmQgPSB7fTtcblxudmFyIHRyYWNrID0gZnVuY3Rpb24gKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgdmFyIHJlYWRfY29uZiA9IHtcbiAgICBcdC8vIFVuaXF1ZSBJRCBmb3IgdGhpcyB0cmFja1xuICAgIFx0aWQgOiB0cmFjay5pZCgpXG4gICAgfTtcblxuICAgIHZhciBkaXNwbGF5O1xuXG4gICAgdmFyIGNvbmYgPSB7XG4gICAgXHQvLyBmb3JlZ3JvdW5kX2NvbG9yIDogZDMucmdiKCcjMDAwMDAwJyksXG4gICAgXHRiYWNrZ3JvdW5kX2NvbG9yIDogZDMucmdiKCcjQ0NDQ0NDJyksXG4gICAgXHRoZWlnaHQgICAgICAgICAgIDogMjUwLFxuICAgIFx0Ly8gZGF0YSBpcyB0aGUgb2JqZWN0IChub3JtYWxseSBhIHRudC50cmFjay5kYXRhIG9iamVjdCkgdXNlZCB0byByZXRyaWV2ZSBhbmQgdXBkYXRlIGRhdGEgZm9yIHRoZSB0cmFja1xuICAgIFx0ZGF0YSAgICAgICAgICAgICA6IHRyYWNrLmRhdGEuZW1wdHkoKSxcbiAgICAgICAgbGFiZWwgICAgICAgICAgICAgOiBcIlwiXG4gICAgfTtcblxuICAgIC8vIFRoZSByZXR1cm5lZCBvYmplY3QgLyBjbG9zdXJlXG4gICAgdmFyIF8gPSBmdW5jdGlvbigpIHt9O1xuXG4gICAgLy8gQVBJXG4gICAgdmFyIGFwaSA9IGFwaWpzIChfKVxuICAgIFx0LmdldHNldCAoY29uZilcbiAgICBcdC5nZXQgKHJlYWRfY29uZik7XG5cbiAgICAvLyBUT0RPOiBUaGlzIG1lYW5zIHRoYXQgaGVpZ2h0IHNob3VsZCBiZSBkZWZpbmVkIGJlZm9yZSBkaXNwbGF5XG4gICAgLy8gd2Ugc2hvdWxkbid0IHJlbHkgb24gdGhpc1xuICAgIF8uZGlzcGxheSA9IGZ1bmN0aW9uIChuZXdfcGxvdHRlcikge1xuICAgICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBkaXNwbGF5O1xuICAgICAgICB9XG4gICAgICAgIGRpc3BsYXkgPSBuZXdfcGxvdHRlcjtcbiAgICAgICAgaWYgKHR5cGVvZiAoZGlzcGxheSkgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGRpc3BsYXkubGF5b3V0ICYmIGRpc3BsYXkubGF5b3V0KCkuaGVpZ2h0KGNvbmYuaGVpZ2h0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBkaXNwbGF5KSB7XG4gICAgICAgICAgICAgICAgaWYgKGRpc3BsYXkuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5W2tleV0ubGF5b3V0ICYmIGRpc3BsYXlba2V5XS5sYXlvdXQoKS5oZWlnaHQoY29uZi5oZWlnaHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBfO1xuICAgIH07XG5cbiAgICByZXR1cm4gXztcbn07XG5cbnRyYWNrLmlkID0gaXRlcmF0b3IoMSk7XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHRyYWNrO1xuIiwibW9kdWxlLmV4cG9ydHMgPSB0bnRfZW5zZW1ibCA9IHJlcXVpcmUoXCIuL3NyYy9yZXN0LmpzXCIpO1xuIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCl7XG4vKiFcbiAqIEBvdmVydmlldyBlczYtcHJvbWlzZSAtIGEgdGlueSBpbXBsZW1lbnRhdGlvbiBvZiBQcm9taXNlcy9BKy5cbiAqIEBjb3B5cmlnaHQgQ29weXJpZ2h0IChjKSAyMDE0IFllaHVkYSBLYXR6LCBUb20gRGFsZSwgU3RlZmFuIFBlbm5lciBhbmQgY29udHJpYnV0b3JzIChDb252ZXJzaW9uIHRvIEVTNiBBUEkgYnkgSmFrZSBBcmNoaWJhbGQpXG4gKiBAbGljZW5zZSAgIExpY2Vuc2VkIHVuZGVyIE1JVCBsaWNlbnNlXG4gKiAgICAgICAgICAgIFNlZSBodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vamFrZWFyY2hpYmFsZC9lczYtcHJvbWlzZS9tYXN0ZXIvTElDRU5TRVxuICogQHZlcnNpb24gICAyLjMuMFxuICovXG5cbihmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkdXRpbHMkJG9iamVjdE9yRnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nIHx8ICh0eXBlb2YgeCA9PT0gJ29iamVjdCcgJiYgeCAhPT0gbnVsbCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJHV0aWxzJCRpc0Z1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkdXRpbHMkJGlzTWF5YmVUaGVuYWJsZSh4KSB7XG4gICAgICByZXR1cm4gdHlwZW9mIHggPT09ICdvYmplY3QnICYmIHggIT09IG51bGw7XG4gICAgfVxuXG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSR1dGlscyQkX2lzQXJyYXk7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KSB7XG4gICAgICBsaWIkZXM2JHByb21pc2UkdXRpbHMkJF9pc0FycmF5ID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4KSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpYiRlczYkcHJvbWlzZSR1dGlscyQkX2lzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xuICAgIH1cblxuICAgIHZhciBsaWIkZXM2JHByb21pc2UkdXRpbHMkJGlzQXJyYXkgPSBsaWIkZXM2JHByb21pc2UkdXRpbHMkJF9pc0FycmF5O1xuICAgIHZhciBsaWIkZXM2JHByb21pc2UkYXNhcCQkbGVuID0gMDtcbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJGFzYXAkJHRvU3RyaW5nID0ge30udG9TdHJpbmc7XG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRhc2FwJCR2ZXJ0eE5leHQ7XG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRjdXN0b21TY2hlZHVsZXJGbjtcblxuICAgIHZhciBsaWIkZXM2JHByb21pc2UkYXNhcCQkYXNhcCA9IGZ1bmN0aW9uIGFzYXAoY2FsbGJhY2ssIGFyZykge1xuICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJHF1ZXVlW2xpYiRlczYkcHJvbWlzZSRhc2FwJCRsZW5dID0gY2FsbGJhY2s7XG4gICAgICBsaWIkZXM2JHByb21pc2UkYXNhcCQkcXVldWVbbGliJGVzNiRwcm9taXNlJGFzYXAkJGxlbiArIDFdID0gYXJnO1xuICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJGxlbiArPSAyO1xuICAgICAgaWYgKGxpYiRlczYkcHJvbWlzZSRhc2FwJCRsZW4gPT09IDIpIHtcbiAgICAgICAgLy8gSWYgbGVuIGlzIDIsIHRoYXQgbWVhbnMgdGhhdCB3ZSBuZWVkIHRvIHNjaGVkdWxlIGFuIGFzeW5jIGZsdXNoLlxuICAgICAgICAvLyBJZiBhZGRpdGlvbmFsIGNhbGxiYWNrcyBhcmUgcXVldWVkIGJlZm9yZSB0aGUgcXVldWUgaXMgZmx1c2hlZCwgdGhleVxuICAgICAgICAvLyB3aWxsIGJlIHByb2Nlc3NlZCBieSB0aGlzIGZsdXNoIHRoYXQgd2UgYXJlIHNjaGVkdWxpbmcuXG4gICAgICAgIGlmIChsaWIkZXM2JHByb21pc2UkYXNhcCQkY3VzdG9tU2NoZWR1bGVyRm4pIHtcbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkYXNhcCQkY3VzdG9tU2NoZWR1bGVyRm4obGliJGVzNiRwcm9taXNlJGFzYXAkJGZsdXNoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkYXNhcCQkc2NoZWR1bGVGbHVzaCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJGFzYXAkJHNldFNjaGVkdWxlcihzY2hlZHVsZUZuKSB7XG4gICAgICBsaWIkZXM2JHByb21pc2UkYXNhcCQkY3VzdG9tU2NoZWR1bGVyRm4gPSBzY2hlZHVsZUZuO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRzZXRBc2FwKGFzYXBGbikge1xuICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJGFzYXAgPSBhc2FwRm47XG4gICAgfVxuXG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRicm93c2VyV2luZG93ID0gKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSA/IHdpbmRvdyA6IHVuZGVmaW5lZDtcbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJGFzYXAkJGJyb3dzZXJHbG9iYWwgPSBsaWIkZXM2JHByb21pc2UkYXNhcCQkYnJvd3NlcldpbmRvdyB8fCB7fTtcbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJGFzYXAkJEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyID0gbGliJGVzNiRwcm9taXNlJGFzYXAkJGJyb3dzZXJHbG9iYWwuTXV0YXRpb25PYnNlcnZlciB8fCBsaWIkZXM2JHByb21pc2UkYXNhcCQkYnJvd3Nlckdsb2JhbC5XZWJLaXRNdXRhdGlvbk9ic2VydmVyO1xuICAgIHZhciBsaWIkZXM2JHByb21pc2UkYXNhcCQkaXNOb2RlID0gdHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHt9LnRvU3RyaW5nLmNhbGwocHJvY2VzcykgPT09ICdbb2JqZWN0IHByb2Nlc3NdJztcblxuICAgIC8vIHRlc3QgZm9yIHdlYiB3b3JrZXIgYnV0IG5vdCBpbiBJRTEwXG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRpc1dvcmtlciA9IHR5cGVvZiBVaW50OENsYW1wZWRBcnJheSAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgIHR5cGVvZiBpbXBvcnRTY3JpcHRzICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgdHlwZW9mIE1lc3NhZ2VDaGFubmVsICE9PSAndW5kZWZpbmVkJztcblxuICAgIC8vIG5vZGVcbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkYXNhcCQkdXNlTmV4dFRpY2soKSB7XG4gICAgICB2YXIgbmV4dFRpY2sgPSBwcm9jZXNzLm5leHRUaWNrO1xuICAgICAgLy8gbm9kZSB2ZXJzaW9uIDAuMTAueCBkaXNwbGF5cyBhIGRlcHJlY2F0aW9uIHdhcm5pbmcgd2hlbiBuZXh0VGljayBpcyB1c2VkIHJlY3Vyc2l2ZWx5XG4gICAgICAvLyBzZXRJbW1lZGlhdGUgc2hvdWxkIGJlIHVzZWQgaW5zdGVhZCBpbnN0ZWFkXG4gICAgICB2YXIgdmVyc2lvbiA9IHByb2Nlc3MudmVyc2lvbnMubm9kZS5tYXRjaCgvXig/OihcXGQrKVxcLik/KD86KFxcZCspXFwuKT8oXFwqfFxcZCspJC8pO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmVyc2lvbikgJiYgdmVyc2lvblsxXSA9PT0gJzAnICYmIHZlcnNpb25bMl0gPT09ICcxMCcpIHtcbiAgICAgICAgbmV4dFRpY2sgPSBzZXRJbW1lZGlhdGU7XG4gICAgICB9XG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIG5leHRUaWNrKGxpYiRlczYkcHJvbWlzZSRhc2FwJCRmbHVzaCk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIHZlcnR4XG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJGFzYXAkJHVzZVZlcnR4VGltZXIoKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCR2ZXJ0eE5leHQobGliJGVzNiRwcm9taXNlJGFzYXAkJGZsdXNoKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJGFzYXAkJHVzZU11dGF0aW9uT2JzZXJ2ZXIoKSB7XG4gICAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgbGliJGVzNiRwcm9taXNlJGFzYXAkJEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyKGxpYiRlczYkcHJvbWlzZSRhc2FwJCRmbHVzaCk7XG4gICAgICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICAgIG9ic2VydmVyLm9ic2VydmUobm9kZSwgeyBjaGFyYWN0ZXJEYXRhOiB0cnVlIH0pO1xuXG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIG5vZGUuZGF0YSA9IChpdGVyYXRpb25zID0gKytpdGVyYXRpb25zICUgMik7XG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIHdlYiB3b3JrZXJcbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkYXNhcCQkdXNlTWVzc2FnZUNoYW5uZWwoKSB7XG4gICAgICB2YXIgY2hhbm5lbCA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xuICAgICAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBsaWIkZXM2JHByb21pc2UkYXNhcCQkZmx1c2g7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICBjaGFubmVsLnBvcnQyLnBvc3RNZXNzYWdlKDApO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkYXNhcCQkdXNlU2V0VGltZW91dCgpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgc2V0VGltZW91dChsaWIkZXM2JHByb21pc2UkYXNhcCQkZmx1c2gsIDEpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJGFzYXAkJHF1ZXVlID0gbmV3IEFycmF5KDEwMDApO1xuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRmbHVzaCgpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGliJGVzNiRwcm9taXNlJGFzYXAkJGxlbjsgaSs9Mikge1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSBsaWIkZXM2JHByb21pc2UkYXNhcCQkcXVldWVbaV07XG4gICAgICAgIHZhciBhcmcgPSBsaWIkZXM2JHByb21pc2UkYXNhcCQkcXVldWVbaSsxXTtcblxuICAgICAgICBjYWxsYmFjayhhcmcpO1xuXG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRxdWV1ZVtpXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJHF1ZXVlW2krMV0gPSB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRsZW4gPSAwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRhdHRlbXB0VmVydGV4KCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgdmFyIHIgPSByZXF1aXJlO1xuICAgICAgICB2YXIgdmVydHggPSByKCd2ZXJ0eCcpO1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkYXNhcCQkdmVydHhOZXh0ID0gdmVydHgucnVuT25Mb29wIHx8IHZlcnR4LnJ1bk9uQ29udGV4dDtcbiAgICAgICAgcmV0dXJuIGxpYiRlczYkcHJvbWlzZSRhc2FwJCR1c2VWZXJ0eFRpbWVyKCk7XG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGxpYiRlczYkcHJvbWlzZSRhc2FwJCR1c2VTZXRUaW1lb3V0KCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRzY2hlZHVsZUZsdXNoO1xuICAgIC8vIERlY2lkZSB3aGF0IGFzeW5jIG1ldGhvZCB0byB1c2UgdG8gdHJpZ2dlcmluZyBwcm9jZXNzaW5nIG9mIHF1ZXVlZCBjYWxsYmFja3M6XG4gICAgaWYgKGxpYiRlczYkcHJvbWlzZSRhc2FwJCRpc05vZGUpIHtcbiAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRzY2hlZHVsZUZsdXNoID0gbGliJGVzNiRwcm9taXNlJGFzYXAkJHVzZU5leHRUaWNrKCk7XG4gICAgfSBlbHNlIGlmIChsaWIkZXM2JHByb21pc2UkYXNhcCQkQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRzY2hlZHVsZUZsdXNoID0gbGliJGVzNiRwcm9taXNlJGFzYXAkJHVzZU11dGF0aW9uT2JzZXJ2ZXIoKTtcbiAgICB9IGVsc2UgaWYgKGxpYiRlczYkcHJvbWlzZSRhc2FwJCRpc1dvcmtlcikge1xuICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJHNjaGVkdWxlRmx1c2ggPSBsaWIkZXM2JHByb21pc2UkYXNhcCQkdXNlTWVzc2FnZUNoYW5uZWwoKTtcbiAgICB9IGVsc2UgaWYgKGxpYiRlczYkcHJvbWlzZSRhc2FwJCRicm93c2VyV2luZG93ID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIHJlcXVpcmUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRzY2hlZHVsZUZsdXNoID0gbGliJGVzNiRwcm9taXNlJGFzYXAkJGF0dGVtcHRWZXJ0ZXgoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJHNjaGVkdWxlRmx1c2ggPSBsaWIkZXM2JHByb21pc2UkYXNhcCQkdXNlU2V0VGltZW91dCgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJG5vb3AoKSB7fVxuXG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFBFTkRJTkcgICA9IHZvaWQgMDtcbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkRlVMRklMTEVEID0gMTtcbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkUkVKRUNURUQgID0gMjtcblxuICAgIHZhciBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRHRVRfVEhFTl9FUlJPUiA9IG5ldyBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRFcnJvck9iamVjdCgpO1xuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkc2VsZkZ1bGxmaWxsbWVudCgpIHtcbiAgICAgIHJldHVybiBuZXcgVHlwZUVycm9yKFwiWW91IGNhbm5vdCByZXNvbHZlIGEgcHJvbWlzZSB3aXRoIGl0c2VsZlwiKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRjYW5ub3RSZXR1cm5Pd24oKSB7XG4gICAgICByZXR1cm4gbmV3IFR5cGVFcnJvcignQSBwcm9taXNlcyBjYWxsYmFjayBjYW5ub3QgcmV0dXJuIHRoYXQgc2FtZSBwcm9taXNlLicpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGdldFRoZW4ocHJvbWlzZSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHByb21pc2UudGhlbjtcbiAgICAgIH0gY2F0Y2goZXJyb3IpIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkR0VUX1RIRU5fRVJST1IuZXJyb3IgPSBlcnJvcjtcbiAgICAgICAgcmV0dXJuIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHRyeVRoZW4odGhlbiwgdmFsdWUsIGZ1bGZpbGxtZW50SGFuZGxlciwgcmVqZWN0aW9uSGFuZGxlcikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgdGhlbi5jYWxsKHZhbHVlLCBmdWxmaWxsbWVudEhhbmRsZXIsIHJlamVjdGlvbkhhbmRsZXIpO1xuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIHJldHVybiBlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGhhbmRsZUZvcmVpZ25UaGVuYWJsZShwcm9taXNlLCB0aGVuYWJsZSwgdGhlbikge1xuICAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRhc2FwKGZ1bmN0aW9uKHByb21pc2UpIHtcbiAgICAgICAgdmFyIHNlYWxlZCA9IGZhbHNlO1xuICAgICAgICB2YXIgZXJyb3IgPSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCR0cnlUaGVuKHRoZW4sIHRoZW5hYmxlLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIGlmIChzZWFsZWQpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgc2VhbGVkID0gdHJ1ZTtcbiAgICAgICAgICBpZiAodGhlbmFibGUgIT09IHZhbHVlKSB7XG4gICAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgICBpZiAoc2VhbGVkKSB7IHJldHVybjsgfVxuICAgICAgICAgIHNlYWxlZCA9IHRydWU7XG5cbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICAgICAgfSwgJ1NldHRsZTogJyArIChwcm9taXNlLl9sYWJlbCB8fCAnIHVua25vd24gcHJvbWlzZScpKTtcblxuICAgICAgICBpZiAoIXNlYWxlZCAmJiBlcnJvcikge1xuICAgICAgICAgIHNlYWxlZCA9IHRydWU7XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgfSwgcHJvbWlzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkaGFuZGxlT3duVGhlbmFibGUocHJvbWlzZSwgdGhlbmFibGUpIHtcbiAgICAgIGlmICh0aGVuYWJsZS5fc3RhdGUgPT09IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJEZVTEZJTExFRCkge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIHRoZW5hYmxlLl9yZXN1bHQpO1xuICAgICAgfSBlbHNlIGlmICh0aGVuYWJsZS5fc3RhdGUgPT09IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFJFSkVDVEVEKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCB0aGVuYWJsZS5fcmVzdWx0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHN1YnNjcmliZSh0aGVuYWJsZSwgdW5kZWZpbmVkLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkaGFuZGxlTWF5YmVUaGVuYWJsZShwcm9taXNlLCBtYXliZVRoZW5hYmxlKSB7XG4gICAgICBpZiAobWF5YmVUaGVuYWJsZS5jb25zdHJ1Y3RvciA9PT0gcHJvbWlzZS5jb25zdHJ1Y3Rvcikge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRoYW5kbGVPd25UaGVuYWJsZShwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB0aGVuID0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkZ2V0VGhlbihtYXliZVRoZW5hYmxlKTtcblxuICAgICAgICBpZiAodGhlbiA9PT0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkR0VUX1RIRU5fRVJST1IpIHtcbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkR0VUX1RIRU5fRVJST1IuZXJyb3IpO1xuICAgICAgICB9IGVsc2UgaWYgKHRoZW4gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSk7XG4gICAgICAgIH0gZWxzZSBpZiAobGliJGVzNiRwcm9taXNlJHV0aWxzJCRpc0Z1bmN0aW9uKHRoZW4pKSB7XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkaGFuZGxlRm9yZWlnblRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUsIHRoZW4pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKSB7XG4gICAgICBpZiAocHJvbWlzZSA9PT0gdmFsdWUpIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHNlbGZGdWxsZmlsbG1lbnQoKSk7XG4gICAgICB9IGVsc2UgaWYgKGxpYiRlczYkcHJvbWlzZSR1dGlscyQkb2JqZWN0T3JGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkaGFuZGxlTWF5YmVUaGVuYWJsZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRwdWJsaXNoUmVqZWN0aW9uKHByb21pc2UpIHtcbiAgICAgIGlmIChwcm9taXNlLl9vbmVycm9yKSB7XG4gICAgICAgIHByb21pc2UuX29uZXJyb3IocHJvbWlzZS5fcmVzdWx0KTtcbiAgICAgIH1cblxuICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcHVibGlzaChwcm9taXNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIHZhbHVlKSB7XG4gICAgICBpZiAocHJvbWlzZS5fc3RhdGUgIT09IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFBFTkRJTkcpIHsgcmV0dXJuOyB9XG5cbiAgICAgIHByb21pc2UuX3Jlc3VsdCA9IHZhbHVlO1xuICAgICAgcHJvbWlzZS5fc3RhdGUgPSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRGVUxGSUxMRUQ7XG5cbiAgICAgIGlmIChwcm9taXNlLl9zdWJzY3JpYmVycy5sZW5ndGggIT09IDApIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJGFzYXAobGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcHVibGlzaCwgcHJvbWlzZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbikge1xuICAgICAgaWYgKHByb21pc2UuX3N0YXRlICE9PSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRQRU5ESU5HKSB7IHJldHVybjsgfVxuICAgICAgcHJvbWlzZS5fc3RhdGUgPSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRSRUpFQ1RFRDtcbiAgICAgIHByb21pc2UuX3Jlc3VsdCA9IHJlYXNvbjtcblxuICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJGFzYXAobGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcHVibGlzaFJlamVjdGlvbiwgcHJvbWlzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkc3Vic2NyaWJlKHBhcmVudCwgY2hpbGQsIG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKSB7XG4gICAgICB2YXIgc3Vic2NyaWJlcnMgPSBwYXJlbnQuX3N1YnNjcmliZXJzO1xuICAgICAgdmFyIGxlbmd0aCA9IHN1YnNjcmliZXJzLmxlbmd0aDtcblxuICAgICAgcGFyZW50Ll9vbmVycm9yID0gbnVsbDtcblxuICAgICAgc3Vic2NyaWJlcnNbbGVuZ3RoXSA9IGNoaWxkO1xuICAgICAgc3Vic2NyaWJlcnNbbGVuZ3RoICsgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkRlVMRklMTEVEXSA9IG9uRnVsZmlsbG1lbnQ7XG4gICAgICBzdWJzY3JpYmVyc1tsZW5ndGggKyBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRSRUpFQ1RFRF0gID0gb25SZWplY3Rpb247XG5cbiAgICAgIGlmIChsZW5ndGggPT09IDAgJiYgcGFyZW50Ll9zdGF0ZSkge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkYXNhcCQkYXNhcChsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRwdWJsaXNoLCBwYXJlbnQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHB1Ymxpc2gocHJvbWlzZSkge1xuICAgICAgdmFyIHN1YnNjcmliZXJzID0gcHJvbWlzZS5fc3Vic2NyaWJlcnM7XG4gICAgICB2YXIgc2V0dGxlZCA9IHByb21pc2UuX3N0YXRlO1xuXG4gICAgICBpZiAoc3Vic2NyaWJlcnMubGVuZ3RoID09PSAwKSB7IHJldHVybjsgfVxuXG4gICAgICB2YXIgY2hpbGQsIGNhbGxiYWNrLCBkZXRhaWwgPSBwcm9taXNlLl9yZXN1bHQ7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3Vic2NyaWJlcnMubGVuZ3RoOyBpICs9IDMpIHtcbiAgICAgICAgY2hpbGQgPSBzdWJzY3JpYmVyc1tpXTtcbiAgICAgICAgY2FsbGJhY2sgPSBzdWJzY3JpYmVyc1tpICsgc2V0dGxlZF07XG5cbiAgICAgICAgaWYgKGNoaWxkKSB7XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkaW52b2tlQ2FsbGJhY2soc2V0dGxlZCwgY2hpbGQsIGNhbGxiYWNrLCBkZXRhaWwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNhbGxiYWNrKGRldGFpbCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcHJvbWlzZS5fc3Vic2NyaWJlcnMubGVuZ3RoID0gMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRFcnJvck9iamVjdCgpIHtcbiAgICAgIHRoaXMuZXJyb3IgPSBudWxsO1xuICAgIH1cblxuICAgIHZhciBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRUUllfQ0FUQ0hfRVJST1IgPSBuZXcgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkRXJyb3JPYmplY3QoKTtcblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHRyeUNhdGNoKGNhbGxiYWNrLCBkZXRhaWwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhkZXRhaWwpO1xuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFRSWV9DQVRDSF9FUlJPUi5lcnJvciA9IGU7XG4gICAgICAgIHJldHVybiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRUUllfQ0FUQ0hfRVJST1I7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkaW52b2tlQ2FsbGJhY2soc2V0dGxlZCwgcHJvbWlzZSwgY2FsbGJhY2ssIGRldGFpbCkge1xuICAgICAgdmFyIGhhc0NhbGxiYWNrID0gbGliJGVzNiRwcm9taXNlJHV0aWxzJCRpc0Z1bmN0aW9uKGNhbGxiYWNrKSxcbiAgICAgICAgICB2YWx1ZSwgZXJyb3IsIHN1Y2NlZWRlZCwgZmFpbGVkO1xuXG4gICAgICBpZiAoaGFzQ2FsbGJhY2spIHtcbiAgICAgICAgdmFsdWUgPSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCR0cnlDYXRjaChjYWxsYmFjaywgZGV0YWlsKTtcblxuICAgICAgICBpZiAodmFsdWUgPT09IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFRSWV9DQVRDSF9FUlJPUikge1xuICAgICAgICAgIGZhaWxlZCA9IHRydWU7XG4gICAgICAgICAgZXJyb3IgPSB2YWx1ZS5lcnJvcjtcbiAgICAgICAgICB2YWx1ZSA9IG51bGw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3VjY2VlZGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwcm9taXNlID09PSB2YWx1ZSkge1xuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRjYW5ub3RSZXR1cm5Pd24oKSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbHVlID0gZGV0YWlsO1xuICAgICAgICBzdWNjZWVkZWQgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAocHJvbWlzZS5fc3RhdGUgIT09IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFBFTkRJTkcpIHtcbiAgICAgICAgLy8gbm9vcFxuICAgICAgfSBlbHNlIGlmIChoYXNDYWxsYmFjayAmJiBzdWNjZWVkZWQpIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKGZhaWxlZCkge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgZXJyb3IpO1xuICAgICAgfSBlbHNlIGlmIChzZXR0bGVkID09PSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRGVUxGSUxMRUQpIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKHNldHRsZWQgPT09IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFJFSkVDVEVEKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkaW5pdGlhbGl6ZVByb21pc2UocHJvbWlzZSwgcmVzb2x2ZXIpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc29sdmVyKGZ1bmN0aW9uIHJlc29sdmVQcm9taXNlKHZhbHVlKXtcbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICAgICAgfSwgZnVuY3Rpb24gcmVqZWN0UHJvbWlzZShyZWFzb24pIHtcbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yKENvbnN0cnVjdG9yLCBpbnB1dCkge1xuICAgICAgdmFyIGVudW1lcmF0b3IgPSB0aGlzO1xuXG4gICAgICBlbnVtZXJhdG9yLl9pbnN0YW5jZUNvbnN0cnVjdG9yID0gQ29uc3RydWN0b3I7XG4gICAgICBlbnVtZXJhdG9yLnByb21pc2UgPSBuZXcgQ29uc3RydWN0b3IobGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkbm9vcCk7XG5cbiAgICAgIGlmIChlbnVtZXJhdG9yLl92YWxpZGF0ZUlucHV0KGlucHV0KSkge1xuICAgICAgICBlbnVtZXJhdG9yLl9pbnB1dCAgICAgPSBpbnB1dDtcbiAgICAgICAgZW51bWVyYXRvci5sZW5ndGggICAgID0gaW5wdXQubGVuZ3RoO1xuICAgICAgICBlbnVtZXJhdG9yLl9yZW1haW5pbmcgPSBpbnB1dC5sZW5ndGg7XG5cbiAgICAgICAgZW51bWVyYXRvci5faW5pdCgpO1xuXG4gICAgICAgIGlmIChlbnVtZXJhdG9yLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGZ1bGZpbGwoZW51bWVyYXRvci5wcm9taXNlLCBlbnVtZXJhdG9yLl9yZXN1bHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGVudW1lcmF0b3IubGVuZ3RoID0gZW51bWVyYXRvci5sZW5ndGggfHwgMDtcbiAgICAgICAgICBlbnVtZXJhdG9yLl9lbnVtZXJhdGUoKTtcbiAgICAgICAgICBpZiAoZW51bWVyYXRvci5fcmVtYWluaW5nID09PSAwKSB7XG4gICAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRmdWxmaWxsKGVudW1lcmF0b3IucHJvbWlzZSwgZW51bWVyYXRvci5fcmVzdWx0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlamVjdChlbnVtZXJhdG9yLnByb21pc2UsIGVudW1lcmF0b3IuX3ZhbGlkYXRpb25FcnJvcigpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsaWIkZXM2JHByb21pc2UkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX3ZhbGlkYXRlSW5wdXQgPSBmdW5jdGlvbihpbnB1dCkge1xuICAgICAgcmV0dXJuIGxpYiRlczYkcHJvbWlzZSR1dGlscyQkaXNBcnJheShpbnB1dCk7XG4gICAgfTtcblxuICAgIGxpYiRlczYkcHJvbWlzZSRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fdmFsaWRhdGlvbkVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbmV3IEVycm9yKCdBcnJheSBNZXRob2RzIG11c3QgYmUgcHJvdmlkZWQgYW4gQXJyYXknKTtcbiAgICB9O1xuXG4gICAgbGliJGVzNiRwcm9taXNlJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl9pbml0ID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLl9yZXN1bHQgPSBuZXcgQXJyYXkodGhpcy5sZW5ndGgpO1xuICAgIH07XG5cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJGVudW1lcmF0b3IkJGRlZmF1bHQgPSBsaWIkZXM2JHByb21pc2UkZW51bWVyYXRvciQkRW51bWVyYXRvcjtcblxuICAgIGxpYiRlczYkcHJvbWlzZSRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fZW51bWVyYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZW51bWVyYXRvciA9IHRoaXM7XG5cbiAgICAgIHZhciBsZW5ndGggID0gZW51bWVyYXRvci5sZW5ndGg7XG4gICAgICB2YXIgcHJvbWlzZSA9IGVudW1lcmF0b3IucHJvbWlzZTtcbiAgICAgIHZhciBpbnB1dCAgID0gZW51bWVyYXRvci5faW5wdXQ7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBwcm9taXNlLl9zdGF0ZSA9PT0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkUEVORElORyAmJiBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgZW51bWVyYXRvci5fZWFjaEVudHJ5KGlucHV0W2ldLCBpKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgbGliJGVzNiRwcm9taXNlJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl9lYWNoRW50cnkgPSBmdW5jdGlvbihlbnRyeSwgaSkge1xuICAgICAgdmFyIGVudW1lcmF0b3IgPSB0aGlzO1xuICAgICAgdmFyIGMgPSBlbnVtZXJhdG9yLl9pbnN0YW5jZUNvbnN0cnVjdG9yO1xuXG4gICAgICBpZiAobGliJGVzNiRwcm9taXNlJHV0aWxzJCRpc01heWJlVGhlbmFibGUoZW50cnkpKSB7XG4gICAgICAgIGlmIChlbnRyeS5jb25zdHJ1Y3RvciA9PT0gYyAmJiBlbnRyeS5fc3RhdGUgIT09IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFBFTkRJTkcpIHtcbiAgICAgICAgICBlbnRyeS5fb25lcnJvciA9IG51bGw7XG4gICAgICAgICAgZW51bWVyYXRvci5fc2V0dGxlZEF0KGVudHJ5Ll9zdGF0ZSwgaSwgZW50cnkuX3Jlc3VsdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZW51bWVyYXRvci5fd2lsbFNldHRsZUF0KGMucmVzb2x2ZShlbnRyeSksIGkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbnVtZXJhdG9yLl9yZW1haW5pbmctLTtcbiAgICAgICAgZW51bWVyYXRvci5fcmVzdWx0W2ldID0gZW50cnk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGxpYiRlczYkcHJvbWlzZSRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fc2V0dGxlZEF0ID0gZnVuY3Rpb24oc3RhdGUsIGksIHZhbHVlKSB7XG4gICAgICB2YXIgZW51bWVyYXRvciA9IHRoaXM7XG4gICAgICB2YXIgcHJvbWlzZSA9IGVudW1lcmF0b3IucHJvbWlzZTtcblxuICAgICAgaWYgKHByb21pc2UuX3N0YXRlID09PSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRQRU5ESU5HKSB7XG4gICAgICAgIGVudW1lcmF0b3IuX3JlbWFpbmluZy0tO1xuXG4gICAgICAgIGlmIChzdGF0ZSA9PT0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkUkVKRUNURUQpIHtcbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGVudW1lcmF0b3IuX3Jlc3VsdFtpXSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChlbnVtZXJhdG9yLl9yZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCBlbnVtZXJhdG9yLl9yZXN1bHQpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBsaWIkZXM2JHByb21pc2UkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX3dpbGxTZXR0bGVBdCA9IGZ1bmN0aW9uKHByb21pc2UsIGkpIHtcbiAgICAgIHZhciBlbnVtZXJhdG9yID0gdGhpcztcblxuICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkc3Vic2NyaWJlKHByb21pc2UsIHVuZGVmaW5lZCwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgZW51bWVyYXRvci5fc2V0dGxlZEF0KGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJEZVTEZJTExFRCwgaSwgdmFsdWUpO1xuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgIGVudW1lcmF0b3IuX3NldHRsZWRBdChsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRSRUpFQ1RFRCwgaSwgcmVhc29uKTtcbiAgICAgIH0pO1xuICAgIH07XG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJHByb21pc2UkYWxsJCRhbGwoZW50cmllcykge1xuICAgICAgcmV0dXJuIG5ldyBsaWIkZXM2JHByb21pc2UkZW51bWVyYXRvciQkZGVmYXVsdCh0aGlzLCBlbnRyaWVzKS5wcm9taXNlO1xuICAgIH1cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJHByb21pc2UkYWxsJCRkZWZhdWx0ID0gbGliJGVzNiRwcm9taXNlJHByb21pc2UkYWxsJCRhbGw7XG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJHByb21pc2UkcmFjZSQkcmFjZShlbnRyaWVzKSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICAgICAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcblxuICAgICAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3IobGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkbm9vcCk7XG5cbiAgICAgIGlmICghbGliJGVzNiRwcm9taXNlJHV0aWxzJCRpc0FycmF5KGVudHJpZXMpKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCBuZXcgVHlwZUVycm9yKCdZb3UgbXVzdCBwYXNzIGFuIGFycmF5IHRvIHJhY2UuJykpO1xuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICAgIH1cblxuICAgICAgdmFyIGxlbmd0aCA9IGVudHJpZXMubGVuZ3RoO1xuXG4gICAgICBmdW5jdGlvbiBvbkZ1bGZpbGxtZW50KHZhbHVlKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBvblJlamVjdGlvbihyZWFzb24pIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBwcm9taXNlLl9zdGF0ZSA9PT0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkUEVORElORyAmJiBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkc3Vic2NyaWJlKENvbnN0cnVjdG9yLnJlc29sdmUoZW50cmllc1tpXSksIHVuZGVmaW5lZCwgb25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9XG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJHJhY2UkJGRlZmF1bHQgPSBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSRyYWNlJCRyYWNlO1xuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJHJlc29sdmUkJHJlc29sdmUob2JqZWN0KSB7XG4gICAgICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICAgICAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcblxuICAgICAgaWYgKG9iamVjdCAmJiB0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0JyAmJiBvYmplY3QuY29uc3RydWN0b3IgPT09IENvbnN0cnVjdG9yKSB7XG4gICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICB9XG5cbiAgICAgIHZhciBwcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJG5vb3ApO1xuICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCBvYmplY3QpO1xuICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxuICAgIHZhciBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSRyZXNvbHZlJCRkZWZhdWx0ID0gbGliJGVzNiRwcm9taXNlJHByb21pc2UkcmVzb2x2ZSQkcmVzb2x2ZTtcbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSRyZWplY3QkJHJlamVjdChyZWFzb24pIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gICAgICB2YXIgQ29uc3RydWN0b3IgPSB0aGlzO1xuICAgICAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3IobGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkbm9vcCk7XG4gICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH1cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJHByb21pc2UkcmVqZWN0JCRkZWZhdWx0ID0gbGliJGVzNiRwcm9taXNlJHByb21pc2UkcmVqZWN0JCRyZWplY3Q7XG5cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJHByb21pc2UkJGNvdW50ZXIgPSAwO1xuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJHByb21pc2UkJG5lZWRzUmVzb2x2ZXIoKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdZb3UgbXVzdCBwYXNzIGEgcmVzb2x2ZXIgZnVuY3Rpb24gYXMgdGhlIGZpcnN0IGFyZ3VtZW50IHRvIHRoZSBwcm9taXNlIGNvbnN0cnVjdG9yJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJHByb21pc2UkJG5lZWRzTmV3KCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkZhaWxlZCB0byBjb25zdHJ1Y3QgJ1Byb21pc2UnOiBQbGVhc2UgdXNlIHRoZSAnbmV3JyBvcGVyYXRvciwgdGhpcyBvYmplY3QgY29uc3RydWN0b3IgY2Fubm90IGJlIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLlwiKTtcbiAgICB9XG5cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJHByb21pc2UkJGRlZmF1bHQgPSBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZTtcbiAgICAvKipcbiAgICAgIFByb21pc2Ugb2JqZWN0cyByZXByZXNlbnQgdGhlIGV2ZW50dWFsIHJlc3VsdCBvZiBhbiBhc3luY2hyb25vdXMgb3BlcmF0aW9uLiBUaGVcbiAgICAgIHByaW1hcnkgd2F5IG9mIGludGVyYWN0aW5nIHdpdGggYSBwcm9taXNlIGlzIHRocm91Z2ggaXRzIGB0aGVuYCBtZXRob2QsIHdoaWNoXG4gICAgICByZWdpc3RlcnMgY2FsbGJhY2tzIHRvIHJlY2VpdmUgZWl0aGVyIGEgcHJvbWlzZSdzIGV2ZW50dWFsIHZhbHVlIG9yIHRoZSByZWFzb25cbiAgICAgIHdoeSB0aGUgcHJvbWlzZSBjYW5ub3QgYmUgZnVsZmlsbGVkLlxuXG4gICAgICBUZXJtaW5vbG9neVxuICAgICAgLS0tLS0tLS0tLS1cblxuICAgICAgLSBgcHJvbWlzZWAgaXMgYW4gb2JqZWN0IG9yIGZ1bmN0aW9uIHdpdGggYSBgdGhlbmAgbWV0aG9kIHdob3NlIGJlaGF2aW9yIGNvbmZvcm1zIHRvIHRoaXMgc3BlY2lmaWNhdGlvbi5cbiAgICAgIC0gYHRoZW5hYmxlYCBpcyBhbiBvYmplY3Qgb3IgZnVuY3Rpb24gdGhhdCBkZWZpbmVzIGEgYHRoZW5gIG1ldGhvZC5cbiAgICAgIC0gYHZhbHVlYCBpcyBhbnkgbGVnYWwgSmF2YVNjcmlwdCB2YWx1ZSAoaW5jbHVkaW5nIHVuZGVmaW5lZCwgYSB0aGVuYWJsZSwgb3IgYSBwcm9taXNlKS5cbiAgICAgIC0gYGV4Y2VwdGlvbmAgaXMgYSB2YWx1ZSB0aGF0IGlzIHRocm93biB1c2luZyB0aGUgdGhyb3cgc3RhdGVtZW50LlxuICAgICAgLSBgcmVhc29uYCBpcyBhIHZhbHVlIHRoYXQgaW5kaWNhdGVzIHdoeSBhIHByb21pc2Ugd2FzIHJlamVjdGVkLlxuICAgICAgLSBgc2V0dGxlZGAgdGhlIGZpbmFsIHJlc3Rpbmcgc3RhdGUgb2YgYSBwcm9taXNlLCBmdWxmaWxsZWQgb3IgcmVqZWN0ZWQuXG5cbiAgICAgIEEgcHJvbWlzZSBjYW4gYmUgaW4gb25lIG9mIHRocmVlIHN0YXRlczogcGVuZGluZywgZnVsZmlsbGVkLCBvciByZWplY3RlZC5cblxuICAgICAgUHJvbWlzZXMgdGhhdCBhcmUgZnVsZmlsbGVkIGhhdmUgYSBmdWxmaWxsbWVudCB2YWx1ZSBhbmQgYXJlIGluIHRoZSBmdWxmaWxsZWRcbiAgICAgIHN0YXRlLiAgUHJvbWlzZXMgdGhhdCBhcmUgcmVqZWN0ZWQgaGF2ZSBhIHJlamVjdGlvbiByZWFzb24gYW5kIGFyZSBpbiB0aGVcbiAgICAgIHJlamVjdGVkIHN0YXRlLiAgQSBmdWxmaWxsbWVudCB2YWx1ZSBpcyBuZXZlciBhIHRoZW5hYmxlLlxuXG4gICAgICBQcm9taXNlcyBjYW4gYWxzbyBiZSBzYWlkIHRvICpyZXNvbHZlKiBhIHZhbHVlLiAgSWYgdGhpcyB2YWx1ZSBpcyBhbHNvIGFcbiAgICAgIHByb21pc2UsIHRoZW4gdGhlIG9yaWdpbmFsIHByb21pc2UncyBzZXR0bGVkIHN0YXRlIHdpbGwgbWF0Y2ggdGhlIHZhbHVlJ3NcbiAgICAgIHNldHRsZWQgc3RhdGUuICBTbyBhIHByb21pc2UgdGhhdCAqcmVzb2x2ZXMqIGEgcHJvbWlzZSB0aGF0IHJlamVjdHMgd2lsbFxuICAgICAgaXRzZWxmIHJlamVjdCwgYW5kIGEgcHJvbWlzZSB0aGF0ICpyZXNvbHZlcyogYSBwcm9taXNlIHRoYXQgZnVsZmlsbHMgd2lsbFxuICAgICAgaXRzZWxmIGZ1bGZpbGwuXG5cblxuICAgICAgQmFzaWMgVXNhZ2U6XG4gICAgICAtLS0tLS0tLS0tLS1cblxuICAgICAgYGBganNcbiAgICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIC8vIG9uIHN1Y2Nlc3NcbiAgICAgICAgcmVzb2x2ZSh2YWx1ZSk7XG5cbiAgICAgICAgLy8gb24gZmFpbHVyZVxuICAgICAgICByZWplY3QocmVhc29uKTtcbiAgICAgIH0pO1xuXG4gICAgICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gb24gZnVsZmlsbG1lbnRcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICAvLyBvbiByZWplY3Rpb25cbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEFkdmFuY2VkIFVzYWdlOlxuICAgICAgLS0tLS0tLS0tLS0tLS0tXG5cbiAgICAgIFByb21pc2VzIHNoaW5lIHdoZW4gYWJzdHJhY3RpbmcgYXdheSBhc3luY2hyb25vdXMgaW50ZXJhY3Rpb25zIHN1Y2ggYXNcbiAgICAgIGBYTUxIdHRwUmVxdWVzdGBzLlxuXG4gICAgICBgYGBqc1xuICAgICAgZnVuY3Rpb24gZ2V0SlNPTih1cmwpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgICAgICAgeGhyLm9wZW4oJ0dFVCcsIHVybCk7XG4gICAgICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGhhbmRsZXI7XG4gICAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdqc29uJztcbiAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgICB4aHIuc2VuZCgpO1xuXG4gICAgICAgICAgZnVuY3Rpb24gaGFuZGxlcigpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlYWR5U3RhdGUgPT09IHRoaXMuRE9ORSkge1xuICAgICAgICAgICAgICBpZiAodGhpcy5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUodGhpcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignZ2V0SlNPTjogYCcgKyB1cmwgKyAnYCBmYWlsZWQgd2l0aCBzdGF0dXM6IFsnICsgdGhpcy5zdGF0dXMgKyAnXScpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBnZXRKU09OKCcvcG9zdHMuanNvbicpLnRoZW4oZnVuY3Rpb24oanNvbikge1xuICAgICAgICAvLyBvbiBmdWxmaWxsbWVudFxuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgIC8vIG9uIHJlamVjdGlvblxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgVW5saWtlIGNhbGxiYWNrcywgcHJvbWlzZXMgYXJlIGdyZWF0IGNvbXBvc2FibGUgcHJpbWl0aXZlcy5cblxuICAgICAgYGBganNcbiAgICAgIFByb21pc2UuYWxsKFtcbiAgICAgICAgZ2V0SlNPTignL3Bvc3RzJyksXG4gICAgICAgIGdldEpTT04oJy9jb21tZW50cycpXG4gICAgICBdKS50aGVuKGZ1bmN0aW9uKHZhbHVlcyl7XG4gICAgICAgIHZhbHVlc1swXSAvLyA9PiBwb3N0c0pTT05cbiAgICAgICAgdmFsdWVzWzFdIC8vID0+IGNvbW1lbnRzSlNPTlxuXG4gICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBAY2xhc3MgUHJvbWlzZVxuICAgICAgQHBhcmFtIHtmdW5jdGlvbn0gcmVzb2x2ZXJcbiAgICAgIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgICAgIEBjb25zdHJ1Y3RvclxuICAgICovXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UocmVzb2x2ZXIpIHtcbiAgICAgIHRoaXMuX2lkID0gbGliJGVzNiRwcm9taXNlJHByb21pc2UkJGNvdW50ZXIrKztcbiAgICAgIHRoaXMuX3N0YXRlID0gdW5kZWZpbmVkO1xuICAgICAgdGhpcy5fcmVzdWx0ID0gdW5kZWZpbmVkO1xuICAgICAgdGhpcy5fc3Vic2NyaWJlcnMgPSBbXTtcblxuICAgICAgaWYgKGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJG5vb3AgIT09IHJlc29sdmVyKSB7XG4gICAgICAgIGlmICghbGliJGVzNiRwcm9taXNlJHV0aWxzJCRpc0Z1bmN0aW9uKHJlc29sdmVyKSkge1xuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJCRuZWVkc1Jlc29sdmVyKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgbGliJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UpKSB7XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJHByb21pc2UkJG5lZWRzTmV3KCk7XG4gICAgICAgIH1cblxuICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRpbml0aWFsaXplUHJvbWlzZSh0aGlzLCByZXNvbHZlcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGliJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UuYWxsID0gbGliJGVzNiRwcm9taXNlJHByb21pc2UkYWxsJCRkZWZhdWx0O1xuICAgIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLnJhY2UgPSBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSRyYWNlJCRkZWZhdWx0O1xuICAgIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLnJlc29sdmUgPSBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSRyZXNvbHZlJCRkZWZhdWx0O1xuICAgIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLnJlamVjdCA9IGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJHJlamVjdCQkZGVmYXVsdDtcbiAgICBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZS5fc2V0U2NoZWR1bGVyID0gbGliJGVzNiRwcm9taXNlJGFzYXAkJHNldFNjaGVkdWxlcjtcbiAgICBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZS5fc2V0QXNhcCA9IGxpYiRlczYkcHJvbWlzZSRhc2FwJCRzZXRBc2FwO1xuICAgIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLl9hc2FwID0gbGliJGVzNiRwcm9taXNlJGFzYXAkJGFzYXA7XG5cbiAgICBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZS5wcm90b3R5cGUgPSB7XG4gICAgICBjb25zdHJ1Y3RvcjogbGliJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UsXG5cbiAgICAvKipcbiAgICAgIFRoZSBwcmltYXJ5IHdheSBvZiBpbnRlcmFjdGluZyB3aXRoIGEgcHJvbWlzZSBpcyB0aHJvdWdoIGl0cyBgdGhlbmAgbWV0aG9kLFxuICAgICAgd2hpY2ggcmVnaXN0ZXJzIGNhbGxiYWNrcyB0byByZWNlaXZlIGVpdGhlciBhIHByb21pc2UncyBldmVudHVhbCB2YWx1ZSBvciB0aGVcbiAgICAgIHJlYXNvbiB3aHkgdGhlIHByb21pc2UgY2Fubm90IGJlIGZ1bGZpbGxlZC5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbih1c2VyKXtcbiAgICAgICAgLy8gdXNlciBpcyBhdmFpbGFibGVcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAgIC8vIHVzZXIgaXMgdW5hdmFpbGFibGUsIGFuZCB5b3UgYXJlIGdpdmVuIHRoZSByZWFzb24gd2h5XG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBDaGFpbmluZ1xuICAgICAgLS0tLS0tLS1cblxuICAgICAgVGhlIHJldHVybiB2YWx1ZSBvZiBgdGhlbmAgaXMgaXRzZWxmIGEgcHJvbWlzZS4gIFRoaXMgc2Vjb25kLCAnZG93bnN0cmVhbSdcbiAgICAgIHByb21pc2UgaXMgcmVzb2x2ZWQgd2l0aCB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBmaXJzdCBwcm9taXNlJ3MgZnVsZmlsbG1lbnRcbiAgICAgIG9yIHJlamVjdGlvbiBoYW5kbGVyLCBvciByZWplY3RlZCBpZiB0aGUgaGFuZGxlciB0aHJvd3MgYW4gZXhjZXB0aW9uLlxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgIHJldHVybiB1c2VyLm5hbWU7XG4gICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIHJldHVybiAnZGVmYXVsdCBuYW1lJztcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHVzZXJOYW1lKSB7XG4gICAgICAgIC8vIElmIGBmaW5kVXNlcmAgZnVsZmlsbGVkLCBgdXNlck5hbWVgIHdpbGwgYmUgdGhlIHVzZXIncyBuYW1lLCBvdGhlcndpc2UgaXRcbiAgICAgICAgLy8gd2lsbCBiZSBgJ2RlZmF1bHQgbmFtZSdgXG4gICAgICB9KTtcblxuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRm91bmQgdXNlciwgYnV0IHN0aWxsIHVuaGFwcHknKTtcbiAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdgZmluZFVzZXJgIHJlamVjdGVkIGFuZCB3ZSdyZSB1bmhhcHB5Jyk7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAvLyBuZXZlciByZWFjaGVkXG4gICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIC8vIGlmIGBmaW5kVXNlcmAgZnVsZmlsbGVkLCBgcmVhc29uYCB3aWxsIGJlICdGb3VuZCB1c2VyLCBidXQgc3RpbGwgdW5oYXBweScuXG4gICAgICAgIC8vIElmIGBmaW5kVXNlcmAgcmVqZWN0ZWQsIGByZWFzb25gIHdpbGwgYmUgJ2BmaW5kVXNlcmAgcmVqZWN0ZWQgYW5kIHdlJ3JlIHVuaGFwcHknLlxuICAgICAgfSk7XG4gICAgICBgYGBcbiAgICAgIElmIHRoZSBkb3duc3RyZWFtIHByb21pc2UgZG9lcyBub3Qgc3BlY2lmeSBhIHJlamVjdGlvbiBoYW5kbGVyLCByZWplY3Rpb24gcmVhc29ucyB3aWxsIGJlIHByb3BhZ2F0ZWQgZnVydGhlciBkb3duc3RyZWFtLlxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgIHRocm93IG5ldyBQZWRhZ29naWNhbEV4Y2VwdGlvbignVXBzdHJlYW0gZXJyb3InKTtcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIC8vIG5ldmVyIHJlYWNoZWRcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIC8vIG5ldmVyIHJlYWNoZWRcbiAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgLy8gVGhlIGBQZWRnYWdvY2lhbEV4Y2VwdGlvbmAgaXMgcHJvcGFnYXRlZCBhbGwgdGhlIHdheSBkb3duIHRvIGhlcmVcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEFzc2ltaWxhdGlvblxuICAgICAgLS0tLS0tLS0tLS0tXG5cbiAgICAgIFNvbWV0aW1lcyB0aGUgdmFsdWUgeW91IHdhbnQgdG8gcHJvcGFnYXRlIHRvIGEgZG93bnN0cmVhbSBwcm9taXNlIGNhbiBvbmx5IGJlXG4gICAgICByZXRyaWV2ZWQgYXN5bmNocm9ub3VzbHkuIFRoaXMgY2FuIGJlIGFjaGlldmVkIGJ5IHJldHVybmluZyBhIHByb21pc2UgaW4gdGhlXG4gICAgICBmdWxmaWxsbWVudCBvciByZWplY3Rpb24gaGFuZGxlci4gVGhlIGRvd25zdHJlYW0gcHJvbWlzZSB3aWxsIHRoZW4gYmUgcGVuZGluZ1xuICAgICAgdW50aWwgdGhlIHJldHVybmVkIHByb21pc2UgaXMgc2V0dGxlZC4gVGhpcyBpcyBjYWxsZWQgKmFzc2ltaWxhdGlvbiouXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgcmV0dXJuIGZpbmRDb21tZW50c0J5QXV0aG9yKHVzZXIpO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAoY29tbWVudHMpIHtcbiAgICAgICAgLy8gVGhlIHVzZXIncyBjb21tZW50cyBhcmUgbm93IGF2YWlsYWJsZVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgSWYgdGhlIGFzc2ltbGlhdGVkIHByb21pc2UgcmVqZWN0cywgdGhlbiB0aGUgZG93bnN0cmVhbSBwcm9taXNlIHdpbGwgYWxzbyByZWplY3QuXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgcmV0dXJuIGZpbmRDb21tZW50c0J5QXV0aG9yKHVzZXIpO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAoY29tbWVudHMpIHtcbiAgICAgICAgLy8gSWYgYGZpbmRDb21tZW50c0J5QXV0aG9yYCBmdWxmaWxscywgd2UnbGwgaGF2ZSB0aGUgdmFsdWUgaGVyZVxuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICAvLyBJZiBgZmluZENvbW1lbnRzQnlBdXRob3JgIHJlamVjdHMsIHdlJ2xsIGhhdmUgdGhlIHJlYXNvbiBoZXJlXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBTaW1wbGUgRXhhbXBsZVxuICAgICAgLS0tLS0tLS0tLS0tLS1cblxuICAgICAgU3luY2hyb25vdXMgRXhhbXBsZVxuXG4gICAgICBgYGBqYXZhc2NyaXB0XG4gICAgICB2YXIgcmVzdWx0O1xuXG4gICAgICB0cnkge1xuICAgICAgICByZXN1bHQgPSBmaW5kUmVzdWx0KCk7XG4gICAgICAgIC8vIHN1Y2Nlc3NcbiAgICAgIH0gY2F0Y2gocmVhc29uKSB7XG4gICAgICAgIC8vIGZhaWx1cmVcbiAgICAgIH1cbiAgICAgIGBgYFxuXG4gICAgICBFcnJiYWNrIEV4YW1wbGVcblxuICAgICAgYGBganNcbiAgICAgIGZpbmRSZXN1bHQoZnVuY3Rpb24ocmVzdWx0LCBlcnIpe1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHN1Y2Nlc3NcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgUHJvbWlzZSBFeGFtcGxlO1xuXG4gICAgICBgYGBqYXZhc2NyaXB0XG4gICAgICBmaW5kUmVzdWx0KCkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgICAgICAvLyBzdWNjZXNzXG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgICAgICAvLyBmYWlsdXJlXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBBZHZhbmNlZCBFeGFtcGxlXG4gICAgICAtLS0tLS0tLS0tLS0tLVxuXG4gICAgICBTeW5jaHJvbm91cyBFeGFtcGxlXG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIHZhciBhdXRob3IsIGJvb2tzO1xuXG4gICAgICB0cnkge1xuICAgICAgICBhdXRob3IgPSBmaW5kQXV0aG9yKCk7XG4gICAgICAgIGJvb2tzICA9IGZpbmRCb29rc0J5QXV0aG9yKGF1dGhvcik7XG4gICAgICAgIC8vIHN1Y2Nlc3NcbiAgICAgIH0gY2F0Y2gocmVhc29uKSB7XG4gICAgICAgIC8vIGZhaWx1cmVcbiAgICAgIH1cbiAgICAgIGBgYFxuXG4gICAgICBFcnJiYWNrIEV4YW1wbGVcblxuICAgICAgYGBganNcblxuICAgICAgZnVuY3Rpb24gZm91bmRCb29rcyhib29rcykge1xuXG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGZhaWx1cmUocmVhc29uKSB7XG5cbiAgICAgIH1cblxuICAgICAgZmluZEF1dGhvcihmdW5jdGlvbihhdXRob3IsIGVycil7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICBmYWlsdXJlKGVycik7XG4gICAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBmaW5kQm9vb2tzQnlBdXRob3IoYXV0aG9yLCBmdW5jdGlvbihib29rcywgZXJyKSB7XG4gICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBmYWlsdXJlKGVycik7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgIGZvdW5kQm9va3MoYm9va3MpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2gocmVhc29uKSB7XG4gICAgICAgICAgICAgICAgICBmYWlsdXJlKHJlYXNvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGNhdGNoKGVycm9yKSB7XG4gICAgICAgICAgICBmYWlsdXJlKGVycik7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIHN1Y2Nlc3NcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgUHJvbWlzZSBFeGFtcGxlO1xuXG4gICAgICBgYGBqYXZhc2NyaXB0XG4gICAgICBmaW5kQXV0aG9yKCkuXG4gICAgICAgIHRoZW4oZmluZEJvb2tzQnlBdXRob3IpLlxuICAgICAgICB0aGVuKGZ1bmN0aW9uKGJvb2tzKXtcbiAgICAgICAgICAvLyBmb3VuZCBib29rc1xuICAgICAgfSkuY2F0Y2goZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEBtZXRob2QgdGhlblxuICAgICAgQHBhcmFtIHtGdW5jdGlvbn0gb25GdWxmaWxsZWRcbiAgICAgIEBwYXJhbSB7RnVuY3Rpb259IG9uUmVqZWN0ZWRcbiAgICAgIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgICAgIEByZXR1cm4ge1Byb21pc2V9XG4gICAgKi9cbiAgICAgIHRoZW46IGZ1bmN0aW9uKG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKSB7XG4gICAgICAgIHZhciBwYXJlbnQgPSB0aGlzO1xuICAgICAgICB2YXIgc3RhdGUgPSBwYXJlbnQuX3N0YXRlO1xuXG4gICAgICAgIGlmIChzdGF0ZSA9PT0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkRlVMRklMTEVEICYmICFvbkZ1bGZpbGxtZW50IHx8IHN0YXRlID09PSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRSRUpFQ1RFRCAmJiAhb25SZWplY3Rpb24pIHtcbiAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjaGlsZCA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJG5vb3ApO1xuICAgICAgICB2YXIgcmVzdWx0ID0gcGFyZW50Ll9yZXN1bHQ7XG5cbiAgICAgICAgaWYgKHN0YXRlKSB7XG4gICAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJndW1lbnRzW3N0YXRlIC0gMV07XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJGFzYXAoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGludm9rZUNhbGxiYWNrKHN0YXRlLCBjaGlsZCwgY2FsbGJhY2ssIHJlc3VsdCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkc3Vic2NyaWJlKHBhcmVudCwgY2hpbGQsIG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjaGlsZDtcbiAgICAgIH0sXG5cbiAgICAvKipcbiAgICAgIGBjYXRjaGAgaXMgc2ltcGx5IHN1Z2FyIGZvciBgdGhlbih1bmRlZmluZWQsIG9uUmVqZWN0aW9uKWAgd2hpY2ggbWFrZXMgaXQgdGhlIHNhbWVcbiAgICAgIGFzIHRoZSBjYXRjaCBibG9jayBvZiBhIHRyeS9jYXRjaCBzdGF0ZW1lbnQuXG5cbiAgICAgIGBgYGpzXG4gICAgICBmdW5jdGlvbiBmaW5kQXV0aG9yKCl7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGRuJ3QgZmluZCB0aGF0IGF1dGhvcicpO1xuICAgICAgfVxuXG4gICAgICAvLyBzeW5jaHJvbm91c1xuICAgICAgdHJ5IHtcbiAgICAgICAgZmluZEF1dGhvcigpO1xuICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgICAgIH1cblxuICAgICAgLy8gYXN5bmMgd2l0aCBwcm9taXNlc1xuICAgICAgZmluZEF1dGhvcigpLmNhdGNoKGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAgIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBAbWV0aG9kIGNhdGNoXG4gICAgICBAcGFyYW0ge0Z1bmN0aW9ufSBvblJlamVjdGlvblxuICAgICAgVXNlZnVsIGZvciB0b29saW5nLlxuICAgICAgQHJldHVybiB7UHJvbWlzZX1cbiAgICAqL1xuICAgICAgJ2NhdGNoJzogZnVuY3Rpb24ob25SZWplY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGhlbihudWxsLCBvblJlamVjdGlvbik7XG4gICAgICB9XG4gICAgfTtcbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkcG9seWZpbGwkJHBvbHlmaWxsKCkge1xuICAgICAgdmFyIGxvY2FsO1xuXG4gICAgICBpZiAodHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICBsb2NhbCA9IGdsb2JhbDtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgbG9jYWwgPSBzZWxmO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBsb2NhbCA9IEZ1bmN0aW9uKCdyZXR1cm4gdGhpcycpKCk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3BvbHlmaWxsIGZhaWxlZCBiZWNhdXNlIGdsb2JhbCBvYmplY3QgaXMgdW5hdmFpbGFibGUgaW4gdGhpcyBlbnZpcm9ubWVudCcpO1xuICAgICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdmFyIFAgPSBsb2NhbC5Qcm9taXNlO1xuXG4gICAgICBpZiAoUCAmJiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoUC5yZXNvbHZlKCkpID09PSAnW29iamVjdCBQcm9taXNlXScgJiYgIVAuY2FzdCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGxvY2FsLlByb21pc2UgPSBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSQkZGVmYXVsdDtcbiAgICB9XG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRwb2x5ZmlsbCQkZGVmYXVsdCA9IGxpYiRlczYkcHJvbWlzZSRwb2x5ZmlsbCQkcG9seWZpbGw7XG5cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJHVtZCQkRVM2UHJvbWlzZSA9IHtcbiAgICAgICdQcm9taXNlJzogbGliJGVzNiRwcm9taXNlJHByb21pc2UkJGRlZmF1bHQsXG4gICAgICAncG9seWZpbGwnOiBsaWIkZXM2JHByb21pc2UkcG9seWZpbGwkJGRlZmF1bHRcbiAgICB9O1xuXG4gICAgLyogZ2xvYmFsIGRlZmluZTp0cnVlIG1vZHVsZTp0cnVlIHdpbmRvdzogdHJ1ZSAqL1xuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZVsnYW1kJ10pIHtcbiAgICAgIGRlZmluZShmdW5jdGlvbigpIHsgcmV0dXJuIGxpYiRlczYkcHJvbWlzZSR1bWQkJEVTNlByb21pc2U7IH0pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlWydleHBvcnRzJ10pIHtcbiAgICAgIG1vZHVsZVsnZXhwb3J0cyddID0gbGliJGVzNiRwcm9taXNlJHVtZCQkRVM2UHJvbWlzZTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0aGlzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgdGhpc1snRVM2UHJvbWlzZSddID0gbGliJGVzNiRwcm9taXNlJHVtZCQkRVM2UHJvbWlzZTtcbiAgICB9XG5cbiAgICBsaWIkZXM2JHByb21pc2UkcG9seWZpbGwkJGRlZmF1bHQoKTtcbn0pLmNhbGwodGhpcyk7XG5cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJJclhVc3VcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIi8qZ2xvYmFscyBkZWZpbmUgKi9cbid1c2Ugc3RyaWN0JztcblxuXG4oZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIGRlZmluZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gKHJvb3QuaHR0cHBsZWFzZXByb21pc2VzID0gZmFjdG9yeShyb290KSk7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyb290KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByb290Lmh0dHBwbGVhc2Vwcm9taXNlcyA9IGZhY3Rvcnkocm9vdCk7XG4gICAgfVxufSh0aGlzLCBmdW5jdGlvbiAocm9vdCkgeyAvLyBqc2hpbnQgaWdub3JlOmxpbmVcbiAgICByZXR1cm4gZnVuY3Rpb24gKFByb21pc2UpIHtcbiAgICAgICAgUHJvbWlzZSA9IFByb21pc2UgfHwgcm9vdCAmJiByb290LlByb21pc2U7XG4gICAgICAgIGlmICghUHJvbWlzZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBQcm9taXNlIGltcGxlbWVudGF0aW9uIGZvdW5kLicpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBwcm9jZXNzUmVxdWVzdDogZnVuY3Rpb24gKHJlcSkge1xuICAgICAgICAgICAgICAgIHZhciByZXNvbHZlLCByZWplY3QsXG4gICAgICAgICAgICAgICAgICAgIG9sZE9ubG9hZCA9IHJlcS5vbmxvYWQsXG4gICAgICAgICAgICAgICAgICAgIG9sZE9uZXJyb3IgPSByZXEub25lcnJvcixcbiAgICAgICAgICAgICAgICAgICAgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlID0gYTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCA9IGI7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJlcS5vbmxvYWQgPSBmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvbGRPbmxvYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IG9sZE9ubG9hZC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJlcS5vbmVycm9yID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICBpZiAob2xkT25lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gb2xkT25lcnJvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmVxLnRoZW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm9taXNlLnRoZW4uYXBwbHkocHJvbWlzZSwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJlcVsnY2F0Y2gnXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHByb21pc2VbJ2NhdGNoJ10uYXBwbHkocHJvbWlzZSwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH07XG59KSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBSZXNwb25zZSA9IHJlcXVpcmUoJy4vcmVzcG9uc2UnKTtcblxuZnVuY3Rpb24gUmVxdWVzdEVycm9yKG1lc3NhZ2UsIHByb3BzKSB7XG4gICAgdmFyIGVyciA9IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgICBlcnIubmFtZSA9ICdSZXF1ZXN0RXJyb3InO1xuICAgIHRoaXMubmFtZSA9IGVyci5uYW1lO1xuICAgIHRoaXMubWVzc2FnZSA9IGVyci5tZXNzYWdlO1xuICAgIGlmIChlcnIuc3RhY2spIHtcbiAgICAgICAgdGhpcy5zdGFjayA9IGVyci5zdGFjaztcbiAgICB9XG5cbiAgICB0aGlzLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5tZXNzYWdlO1xuICAgIH07XG5cbiAgICBmb3IgKHZhciBrIGluIHByb3BzKSB7XG4gICAgICAgIGlmIChwcm9wcy5oYXNPd25Qcm9wZXJ0eShrKSkge1xuICAgICAgICAgICAgdGhpc1trXSA9IHByb3BzW2tdO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5SZXF1ZXN0RXJyb3IucHJvdG90eXBlID0gRXJyb3IucHJvdG90eXBlO1xuXG5SZXF1ZXN0RXJyb3IuY3JlYXRlID0gZnVuY3Rpb24gKG1lc3NhZ2UsIHJlcSwgcHJvcHMpIHtcbiAgICB2YXIgZXJyID0gbmV3IFJlcXVlc3RFcnJvcihtZXNzYWdlLCBwcm9wcyk7XG4gICAgUmVzcG9uc2UuY2FsbChlcnIsIHJlcSk7XG4gICAgcmV0dXJuIGVycjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUmVxdWVzdEVycm9yO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaSxcbiAgICBjbGVhblVSTCA9IHJlcXVpcmUoJy4uL3BsdWdpbnMvY2xlYW51cmwnKSxcbiAgICBYSFIgPSByZXF1aXJlKCcuL3hocicpLFxuICAgIGRlbGF5ID0gcmVxdWlyZSgnLi91dGlscy9kZWxheScpLFxuICAgIGNyZWF0ZUVycm9yID0gcmVxdWlyZSgnLi9lcnJvcicpLmNyZWF0ZSxcbiAgICBSZXNwb25zZSA9IHJlcXVpcmUoJy4vcmVzcG9uc2UnKSxcbiAgICBSZXF1ZXN0ID0gcmVxdWlyZSgnLi9yZXF1ZXN0JyksXG4gICAgZXh0ZW5kID0gcmVxdWlyZSgneHRlbmQnKSxcbiAgICBvbmNlID0gcmVxdWlyZSgnLi91dGlscy9vbmNlJyk7XG5cbmZ1bmN0aW9uIGZhY3RvcnkoZGVmYXVsdHMsIHBsdWdpbnMpIHtcbiAgICBkZWZhdWx0cyA9IGRlZmF1bHRzIHx8IHt9O1xuICAgIHBsdWdpbnMgPSBwbHVnaW5zIHx8IFtdO1xuXG4gICAgZnVuY3Rpb24gaHR0cChyZXEsIGNiKSB7XG4gICAgICAgIHZhciB4aHIsIHBsdWdpbiwgZG9uZSwgaywgdGltZW91dElkO1xuXG4gICAgICAgIHJlcSA9IG5ldyBSZXF1ZXN0KGV4dGVuZChkZWZhdWx0cywgcmVxKSk7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHBsdWdpbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHBsdWdpbiA9IHBsdWdpbnNbaV07XG4gICAgICAgICAgICBpZiAocGx1Z2luLnByb2Nlc3NSZXF1ZXN0KSB7XG4gICAgICAgICAgICAgICAgcGx1Z2luLnByb2Nlc3NSZXF1ZXN0KHJlcSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBHaXZlIHRoZSBwbHVnaW5zIGEgY2hhbmNlIHRvIGNyZWF0ZSB0aGUgWEhSIG9iamVjdFxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcGx1Z2lucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgcGx1Z2luID0gcGx1Z2luc1tpXTtcbiAgICAgICAgICAgIGlmIChwbHVnaW4uY3JlYXRlWEhSKSB7XG4gICAgICAgICAgICAgICAgeGhyID0gcGx1Z2luLmNyZWF0ZVhIUihyZXEpO1xuICAgICAgICAgICAgICAgIGJyZWFrOyAvLyBGaXJzdCBjb21lLCBmaXJzdCBzZXJ2ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHhociA9IHhociB8fCBuZXcgWEhSKCk7XG5cbiAgICAgICAgcmVxLnhociA9IHhocjtcblxuICAgICAgICAvLyBCZWNhdXNlIFhIUiBjYW4gYmUgYW4gWE1MSHR0cFJlcXVlc3Qgb3IgYW4gWERvbWFpblJlcXVlc3QsIHdlIGFkZFxuICAgICAgICAvLyBgb25yZWFkeXN0YXRlY2hhbmdlYCwgYG9ubG9hZGAsIGFuZCBgb25lcnJvcmAgY2FsbGJhY2tzLiBXZSB1c2UgdGhlXG4gICAgICAgIC8vIGBvbmNlYCB1dGlsIHRvIG1ha2Ugc3VyZSB0aGF0IG9ubHkgb25lIGlzIGNhbGxlZCAoYW5kIGl0J3Mgb25seSBjYWxsZWRcbiAgICAgICAgLy8gb25lIHRpbWUpLlxuICAgICAgICBkb25lID0gb25jZShkZWxheShmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICAgICAgICAgIHhoci5vbmxvYWQgPSB4aHIub25lcnJvciA9IHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSB4aHIub250aW1lb3V0ID0geGhyLm9ucHJvZ3Jlc3MgPSBudWxsO1xuICAgICAgICAgICAgdmFyIHJlcyA9IGVyciAmJiBlcnIuaXNIdHRwRXJyb3IgPyBlcnIgOiBuZXcgUmVzcG9uc2UocmVxKTtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBwbHVnaW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcGx1Z2luID0gcGx1Z2luc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAocGx1Z2luLnByb2Nlc3NSZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICBwbHVnaW4ucHJvY2Vzc1Jlc3BvbnNlKHJlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGlmIChyZXEub25lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICByZXEub25lcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlcS5vbmxvYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVxLm9ubG9hZChyZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjYikge1xuICAgICAgICAgICAgICAgIGNiKGVyciwgcmVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuXG4gICAgICAgIC8vIFdoZW4gdGhlIHJlcXVlc3QgY29tcGxldGVzLCBjb250aW51ZS5cbiAgICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChyZXEudGltZWRPdXQpIHJldHVybjtcblxuICAgICAgICAgICAgaWYgKHJlcS5hYm9ydGVkKSB7XG4gICAgICAgICAgICAgICAgZG9uZShjcmVhdGVFcnJvcignUmVxdWVzdCBhYm9ydGVkJywgcmVxLCB7bmFtZTogJ0Fib3J0J30pKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoeGhyLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IE1hdGguZmxvb3IoeGhyLnN0YXR1cyAvIDEwMCk7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGUgPT09IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoeGhyLnN0YXR1cyA9PT0gNDA0ICYmICFyZXEuZXJyb3JPbjQwNCkge1xuICAgICAgICAgICAgICAgICAgICBkb25lKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGtpbmQ7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSA0OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtpbmQgPSAnQ2xpZW50JztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgNTpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBraW5kID0gJ1NlcnZlcic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtpbmQgPSAnSFRUUCc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdmFyIG1zZyA9IGtpbmQgKyAnIEVycm9yOiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdUaGUgc2VydmVyIHJldHVybmVkIGEgc3RhdHVzIG9mICcgKyB4aHIuc3RhdHVzICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcgZm9yIHRoZSByZXF1ZXN0IFwiJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXEubWV0aG9kLnRvVXBwZXJDYXNlKCkgKyAnICcgKyByZXEudXJsICsgJ1wiJztcbiAgICAgICAgICAgICAgICAgICAgZG9uZShjcmVhdGVFcnJvcihtc2csIHJlcSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBgb25sb2FkYCBpcyBvbmx5IGNhbGxlZCBvbiBzdWNjZXNzIGFuZCwgaW4gSUUsIHdpbGwgYmUgY2FsbGVkIHdpdGhvdXRcbiAgICAgICAgLy8gYHhoci5zdGF0dXNgIGhhdmluZyBiZWVuIHNldCwgc28gd2UgZG9uJ3QgY2hlY2sgaXQuXG4gICAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7IGRvbmUoKTsgfTtcblxuICAgICAgICB4aHIub25lcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGRvbmUoY3JlYXRlRXJyb3IoJ0ludGVybmFsIFhIUiBFcnJvcicsIHJlcSkpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIElFIHNvbWV0aW1lcyBmYWlscyBpZiB5b3UgZG9uJ3Qgc3BlY2lmeSBldmVyeSBoYW5kbGVyLlxuICAgICAgICAvLyBTZWUgaHR0cDovL3NvY2lhbC5tc2RuLm1pY3Jvc29mdC5jb20vRm9ydW1zL2llL2VuLVVTLzMwZWYzYWRkLTc2N2MtNDQzNi1iOGE5LWYxY2ExOWI0ODEyZS9pZTktcnRtLXhkb21haW5yZXF1ZXN0LWlzc3VlZC1yZXF1ZXN0cy1tYXktYWJvcnQtaWYtYWxsLWV2ZW50LWhhbmRsZXJzLW5vdC1zcGVjaWZpZWQ/Zm9ydW09aWV3ZWJkZXZlbG9wbWVudFxuICAgICAgICB4aHIub250aW1lb3V0ID0gZnVuY3Rpb24gKCkgeyAvKiBub29wICovIH07XG4gICAgICAgIHhoci5vbnByb2dyZXNzID0gZnVuY3Rpb24gKCkgeyAvKiBub29wICovIH07XG5cbiAgICAgICAgeGhyLm9wZW4ocmVxLm1ldGhvZCwgcmVxLnVybCk7XG5cbiAgICAgICAgaWYgKHJlcS50aW1lb3V0KSB7XG4gICAgICAgICAgICAvLyBJZiB3ZSB1c2UgdGhlIG5vcm1hbCBYSFIgdGltZW91dCBtZWNoYW5pc20gKGB4aHIudGltZW91dGAgYW5kXG4gICAgICAgICAgICAvLyBgeGhyLm9udGltZW91dGApLCBgb25yZWFkeXN0YXRlY2hhbmdlYCB3aWxsIGJlIHRyaWdnZXJlZCBiZWZvcmVcbiAgICAgICAgICAgIC8vIGBvbnRpbWVvdXRgLiBUaGVyZSdzIG5vIHdheSB0byByZWNvZ25pemUgdGhhdCBpdCB3YXMgdHJpZ2dlcmVkIGJ5XG4gICAgICAgICAgICAvLyBhIHRpbWVvdXQsIGFuZCB3ZSdkIGJlIHVuYWJsZSB0byBkaXNwYXRjaCB0aGUgcmlnaHQgZXJyb3IuXG4gICAgICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXEudGltZWRPdXQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGRvbmUoY3JlYXRlRXJyb3IoJ1JlcXVlc3QgdGltZW91dCcsIHJlcSwge25hbWU6ICdUaW1lb3V0J30pKTtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICB4aHIuYWJvcnQoKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnIpIHt9XG4gICAgICAgICAgICB9LCByZXEudGltZW91dCk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGsgaW4gcmVxLmhlYWRlcnMpIHtcbiAgICAgICAgICAgIGlmIChyZXEuaGVhZGVycy5oYXNPd25Qcm9wZXJ0eShrKSkge1xuICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKGssIHJlcS5oZWFkZXJzW2tdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHhoci5zZW5kKHJlcS5ib2R5KTtcblxuICAgICAgICByZXR1cm4gcmVxO1xuICAgIH1cblxuICAgIHZhciBtZXRob2QsXG4gICAgICAgIG1ldGhvZHMgPSBbJ2dldCcsICdwb3N0JywgJ3B1dCcsICdoZWFkJywgJ3BhdGNoJywgJ2RlbGV0ZSddLFxuICAgICAgICB2ZXJiID0gZnVuY3Rpb24gKG1ldGhvZCkge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChyZXEsIGNiKSB7XG4gICAgICAgICAgICAgICAgcmVxID0gbmV3IFJlcXVlc3QocmVxKTtcbiAgICAgICAgICAgICAgICByZXEubWV0aG9kID0gbWV0aG9kO1xuICAgICAgICAgICAgICAgIHJldHVybiBodHRwKHJlcSwgY2IpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbWV0aG9kcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBtZXRob2QgPSBtZXRob2RzW2ldO1xuICAgICAgICBodHRwW21ldGhvZF0gPSB2ZXJiKG1ldGhvZCk7XG4gICAgfVxuXG4gICAgaHR0cC5wbHVnaW5zID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gcGx1Z2lucztcbiAgICB9O1xuXG4gICAgaHR0cC5kZWZhdWx0cyA9IGZ1bmN0aW9uIChuZXdWYWx1ZXMpIHtcbiAgICAgICAgaWYgKG5ld1ZhbHVlcykge1xuICAgICAgICAgICAgcmV0dXJuIGZhY3RvcnkoZXh0ZW5kKGRlZmF1bHRzLCBuZXdWYWx1ZXMpLCBwbHVnaW5zKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGVmYXVsdHM7XG4gICAgfTtcblxuICAgIGh0dHAudXNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbmV3UGx1Z2lucyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gICAgICAgIHJldHVybiBmYWN0b3J5KGRlZmF1bHRzLCBwbHVnaW5zLmNvbmNhdChuZXdQbHVnaW5zKSk7XG4gICAgfTtcblxuICAgIGh0dHAuYmFyZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGZhY3RvcnkoKTtcbiAgICB9O1xuXG4gICAgaHR0cC5SZXF1ZXN0ID0gUmVxdWVzdDtcbiAgICBodHRwLlJlc3BvbnNlID0gUmVzcG9uc2U7XG5cbiAgICByZXR1cm4gaHR0cDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHt9LCBbY2xlYW5VUkxdKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gUmVxdWVzdChvcHRzT3JVcmwpIHtcbiAgICB2YXIgb3B0cyA9IHR5cGVvZiBvcHRzT3JVcmwgPT09ICdzdHJpbmcnID8ge3VybDogb3B0c09yVXJsfSA6IG9wdHNPclVybCB8fCB7fTtcbiAgICB0aGlzLm1ldGhvZCA9IG9wdHMubWV0aG9kID8gb3B0cy5tZXRob2QudG9VcHBlckNhc2UoKSA6ICdHRVQnO1xuICAgIHRoaXMudXJsID0gb3B0cy51cmw7XG4gICAgdGhpcy5oZWFkZXJzID0gb3B0cy5oZWFkZXJzIHx8IHt9O1xuICAgIHRoaXMuYm9keSA9IG9wdHMuYm9keTtcbiAgICB0aGlzLnRpbWVvdXQgPSBvcHRzLnRpbWVvdXQgfHwgMDtcbiAgICB0aGlzLmVycm9yT240MDQgPSBvcHRzLmVycm9yT240MDQgIT0gbnVsbCA/IG9wdHMuZXJyb3JPbjQwNCA6IHRydWU7XG4gICAgdGhpcy5vbmxvYWQgPSBvcHRzLm9ubG9hZDtcbiAgICB0aGlzLm9uZXJyb3IgPSBvcHRzLm9uZXJyb3I7XG59XG5cblJlcXVlc3QucHJvdG90eXBlLmFib3J0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmFib3J0ZWQpIHJldHVybjtcbiAgICB0aGlzLmFib3J0ZWQgPSB0cnVlO1xuICAgIHRoaXMueGhyLmFib3J0KCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5oZWFkZXIgPSBmdW5jdGlvbiAobmFtZSwgdmFsdWUpIHtcbiAgICB2YXIgaztcbiAgICBmb3IgKGsgaW4gdGhpcy5oZWFkZXJzKSB7XG4gICAgICAgIGlmICh0aGlzLmhlYWRlcnMuaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgIGlmIChuYW1lLnRvTG93ZXJDYXNlKCkgPT09IGsudG9Mb3dlckNhc2UoKSkge1xuICAgICAgICAgICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhlYWRlcnNba107XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuaGVhZGVyc1trXTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAodmFsdWUgIT0gbnVsbCkge1xuICAgICAgICB0aGlzLmhlYWRlcnNbbmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBSZXF1ZXN0O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgUmVxdWVzdCA9IHJlcXVpcmUoJy4vcmVxdWVzdCcpO1xuXG5cbmZ1bmN0aW9uIFJlc3BvbnNlKHJlcSkge1xuICAgIHZhciBpLCBsaW5lcywgbSxcbiAgICAgICAgeGhyID0gcmVxLnhocjtcbiAgICB0aGlzLnJlcXVlc3QgPSByZXE7XG4gICAgdGhpcy54aHIgPSB4aHI7XG4gICAgdGhpcy5oZWFkZXJzID0ge307XG5cbiAgICAvLyBCcm93c2VycyBkb24ndCBsaWtlIHlvdSB0cnlpbmcgdG8gcmVhZCBYSFIgcHJvcGVydGllcyB3aGVuIHlvdSBhYm9ydCB0aGVcbiAgICAvLyByZXF1ZXN0LCBzbyB3ZSBkb24ndC5cbiAgICBpZiAocmVxLmFib3J0ZWQgfHwgcmVxLnRpbWVkT3V0KSByZXR1cm47XG5cbiAgICB0aGlzLnN0YXR1cyA9IHhoci5zdGF0dXMgfHwgMDtcbiAgICB0aGlzLnRleHQgPSB4aHIucmVzcG9uc2VUZXh0O1xuICAgIHRoaXMuYm9keSA9IHhoci5yZXNwb25zZSB8fCB4aHIucmVzcG9uc2VUZXh0O1xuICAgIHRoaXMuY29udGVudFR5cGUgPSB4aHIuY29udGVudFR5cGUgfHwgKHhoci5nZXRSZXNwb25zZUhlYWRlciAmJiB4aHIuZ2V0UmVzcG9uc2VIZWFkZXIoJ0NvbnRlbnQtVHlwZScpKTtcblxuICAgIGlmICh4aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKSB7XG4gICAgICAgIGxpbmVzID0geGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpLnNwbGl0KCdcXG4nKTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoKG0gPSBsaW5lc1tpXS5tYXRjaCgvXFxzKihbXlxcc10rKTpcXHMrKFteXFxzXSspLykpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5oZWFkZXJzW21bMV1dID0gbVsyXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuaXNIdHRwRXJyb3IgPSB0aGlzLnN0YXR1cyA+PSA0MDA7XG59XG5cblJlc3BvbnNlLnByb3RvdHlwZS5oZWFkZXIgPSBSZXF1ZXN0LnByb3RvdHlwZS5oZWFkZXI7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBSZXNwb25zZTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gV3JhcCBhIGZ1bmN0aW9uIGluIGEgYHNldFRpbWVvdXRgIGNhbGwuIFRoaXMgaXMgdXNlZCB0byBndWFyYW50ZWUgYXN5bmNcbi8vIGJlaGF2aW9yLCB3aGljaCBjYW4gYXZvaWQgdW5leHBlY3RlZCBlcnJvcnMuXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyXG4gICAgICAgICAgICBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSxcbiAgICAgICAgICAgIG5ld0Z1bmMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgc2V0VGltZW91dChuZXdGdW5jLCAwKTtcbiAgICB9O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gQSBcIm9uY2VcIiB1dGlsaXR5LlxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICB2YXIgcmVzdWx0LCBjYWxsZWQgPSBmYWxzZTtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIWNhbGxlZCkge1xuICAgICAgICAgICAgY2FsbGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gd2luZG93LlhNTEh0dHBSZXF1ZXN0O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBleHRlbmRcblxuZnVuY3Rpb24gZXh0ZW5kKCkge1xuICAgIHZhciB0YXJnZXQgPSB7fVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXVxuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgIHRhcmdldFtrZXldID0gc291cmNlW2tleV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0YXJnZXRcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcHJvY2Vzc1JlcXVlc3Q6IGZ1bmN0aW9uIChyZXEpIHtcbiAgICAgICAgcmVxLnVybCA9IHJlcS51cmwucmVwbGFjZSgvW14lXSsvZywgZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgIHJldHVybiBlbmNvZGVVUkkocyk7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBqc29ucmVxdWVzdCA9IHJlcXVpcmUoJy4vanNvbnJlcXVlc3QnKSxcbiAgICBqc29ucmVzcG9uc2UgPSByZXF1aXJlKCcuL2pzb25yZXNwb25zZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBwcm9jZXNzUmVxdWVzdDogZnVuY3Rpb24gKHJlcSkge1xuICAgICAgICBqc29ucmVxdWVzdC5wcm9jZXNzUmVxdWVzdC5jYWxsKHRoaXMsIHJlcSk7XG4gICAgICAgIGpzb25yZXNwb25zZS5wcm9jZXNzUmVxdWVzdC5jYWxsKHRoaXMsIHJlcSk7XG4gICAgfSxcbiAgICBwcm9jZXNzUmVzcG9uc2U6IGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAganNvbnJlc3BvbnNlLnByb2Nlc3NSZXNwb25zZS5jYWxsKHRoaXMsIHJlcyk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcHJvY2Vzc1JlcXVlc3Q6IGZ1bmN0aW9uIChyZXEpIHtcbiAgICAgICAgdmFyXG4gICAgICAgICAgICBjb250ZW50VHlwZSA9IHJlcS5oZWFkZXIoJ0NvbnRlbnQtVHlwZScpLFxuICAgICAgICAgICAgaGFzSnNvbkNvbnRlbnRUeXBlID0gY29udGVudFR5cGUgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnRUeXBlLmluZGV4T2YoJ2FwcGxpY2F0aW9uL2pzb24nKSAhPT0gLTE7XG5cbiAgICAgICAgaWYgKGNvbnRlbnRUeXBlICE9IG51bGwgJiYgIWhhc0pzb25Db250ZW50VHlwZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlcS5ib2R5KSB7XG4gICAgICAgICAgICBpZiAoIWNvbnRlbnRUeXBlKSB7XG4gICAgICAgICAgICAgICAgcmVxLmhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVxLmJvZHkgPSBKU09OLnN0cmluZ2lmeShyZXEuYm9keSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBwcm9jZXNzUmVxdWVzdDogZnVuY3Rpb24gKHJlcSkge1xuICAgICAgICB2YXIgYWNjZXB0ID0gcmVxLmhlYWRlcignQWNjZXB0Jyk7XG4gICAgICAgIGlmIChhY2NlcHQgPT0gbnVsbCkge1xuICAgICAgICAgICAgcmVxLmhlYWRlcignQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgcHJvY2Vzc1Jlc3BvbnNlOiBmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgIC8vIENoZWNrIHRvIHNlZSBpZiB0aGUgY29udGVudHlwZSBpcyBcInNvbWV0aGluZy9qc29uXCIgb3JcbiAgICAgICAgLy8gXCJzb21ldGhpbmcvc29tZXRoaW5nZWxzZStqc29uXCJcbiAgICAgICAgaWYgKHJlcy5jb250ZW50VHlwZSAmJiAvXi4qXFwvKD86LipcXCspP2pzb24oO3wkKS9pLnRlc3QocmVzLmNvbnRlbnRUeXBlKSkge1xuICAgICAgICAgICAgdmFyIHJhdyA9IHR5cGVvZiByZXMuYm9keSA9PT0gJ3N0cmluZycgPyByZXMuYm9keSA6IHJlcy50ZXh0O1xuICAgICAgICAgICAgaWYgKHJhdykge1xuICAgICAgICAgICAgICAgIHJlcy5ib2R5ID0gSlNPTi5wYXJzZShyYXcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcbiIsInZhciBodHRwID0gcmVxdWlyZShcImh0dHBwbGVhc2VcIik7XG52YXIgYXBpanMgPSByZXF1aXJlKFwidG50LmFwaVwiKTtcbnZhciBwcm9taXNlcyA9IHJlcXVpcmUoJ2h0dHBwbGVhc2UtcHJvbWlzZXMnKTtcbnZhciBQcm9taXNlID0gcmVxdWlyZSgnZXM2LXByb21pc2UnKS5Qcm9taXNlO1xudmFyIGpzb24gPSByZXF1aXJlKFwiaHR0cHBsZWFzZS9wbHVnaW5zL2pzb25cIik7XG5odHRwID0gaHR0cC51c2UoanNvbikudXNlKHByb21pc2VzKFByb21pc2UpKTtcblxudG50X2VSZXN0ID0gZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgY29uZmlnID0ge1xuICAgICAgICBwcm94eVVybCA6IFwiaHR0cHM6Ly9yZXN0LmVuc2VtYmwub3JnXCJcbiAgICB9O1xuICAgIC8vIFByZWZpeGVzIHRvIHVzZSB0aGUgUkVTVCBBUEkuXG4gICAgLy92YXIgcHJveHlVcmwgPSBcImh0dHBzOi8vcmVzdC5lbnNlbWJsLm9yZ1wiO1xuICAgIC8vdmFyIHByZWZpeF9yZWdpb24gPSBwcmVmaXggKyBcIi9vdmVybGFwL3JlZ2lvbi9cIjtcbiAgICAvL3ZhciBwcmVmaXhfZW5zZ2VuZSA9IHByZWZpeCArIFwiL2xvb2t1cC9pZC9cIjtcbiAgICAvL3ZhciBwcmVmaXhfeHJlZiA9IHByZWZpeCArIFwiL3hyZWZzL3N5bWJvbC9cIjtcbiAgICAvL3ZhciBwcmVmaXhfaG9tb2xvZ3VlcyA9IHByZWZpeCArIFwiL2hvbW9sb2d5L2lkL1wiO1xuICAgIC8vdmFyIHByZWZpeF9jaHJfaW5mbyA9IHByZWZpeCArIFwiL2luZm8vYXNzZW1ibHkvXCI7XG4gICAgLy92YXIgcHJlZml4X2Fsbl9yZWdpb24gPSBwcmVmaXggKyBcIi9hbGlnbm1lbnQvcmVnaW9uL1wiO1xuICAgIC8vdmFyIHByZWZpeF9nZW5lX3RyZWUgPSBwcmVmaXggKyBcIi9nZW5ldHJlZS9pZC9cIjtcbiAgICAvL3ZhciBwcmVmaXhfYXNzZW1ibHkgPSBwcmVmaXggKyBcIi9pbmZvL2Fzc2VtYmx5L1wiO1xuICAgIC8vdmFyIHByZWZpeF9zZXF1ZW5jZSA9IHByZWZpeCArIFwiL3NlcXVlbmNlL3JlZ2lvbi9cIjtcbiAgICAvL3ZhciBwcmVmaXhfdmFyaWF0aW9uID0gcHJlZml4ICsgXCIvdmFyaWF0aW9uL1wiO1xuXG4gICAgLy8gTnVtYmVyIG9mIGNvbm5lY3Rpb25zIG1hZGUgdG8gdGhlIGRhdGFiYXNlXG4gICAgdmFyIGNvbm5lY3Rpb25zID0gMDtcblxuICAgIHZhciBlUmVzdCA9IGZ1bmN0aW9uKCkge1xuICAgIH07XG5cbiAgICAvLyBMaW1pdHMgaW1wb3NlZCBieSB0aGUgZW5zZW1ibCBSRVNUIEFQSVxuICAgIGVSZXN0LmxpbWl0cyA9IHtcbiAgICAgICAgcmVnaW9uIDogNTAwMDAwMFxuICAgIH07XG5cbiAgICB2YXIgYXBpID0gYXBpanMgKGVSZXN0KTtcblxuICAgIGFwaS5nZXRzZXQgKGNvbmZpZyk7XG5cbiAgICAvKiogPHN0cm9uZz5jYWxsPC9zdHJvbmc+IG1ha2VzIGFuIGFzeW5jaHJvbm91cyBjYWxsIHRvIHRoZSBlbnNlbWJsIFJFU1Qgc2VydmljZS5cblx0QHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIEEgbGl0ZXJhbCBvYmplY3QgY29udGFpbmluZyB0aGUgZm9sbG93aW5nIGZpZWxkczpcblx0PHVsPlxuXHQ8bGk+dXJsID0+IFRoZSByZXN0IFVSTC4gVGhpcyBpcyByZXR1cm5lZCBieSB7QGxpbmsgZVJlc3QudXJsfTwvbGk+XG5cdDxsaT5zdWNjZXNzID0+IEEgY2FsbGJhY2sgdG8gYmUgY2FsbGVkIHdoZW4gdGhlIFJFU1QgcXVlcnkgaXMgc3VjY2Vzc2Z1bCAoaS5lLiB0aGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGlzIGEgZGVmaW5lZCB2YWx1ZSBhbmQgbm8gZXJyb3IgaGFzIGJlZW4gcmV0dXJuZWQpPC9saT5cblx0PGxpPmVycm9yID0+IEEgY2FsbGJhY2sgdG8gYmUgY2FsbGVkIHdoZW4gdGhlIFJFU1QgcXVlcnkgcmV0dXJucyBhbiBlcnJvclxuXHQ8L3VsPlxuICAgICovXG4gICAgYXBpLm1ldGhvZCAoJ2NhbGwnLCBmdW5jdGlvbiAobXl1cmwsIGRhdGEpIHtcblx0aWYgKGRhdGEpIHtcblx0ICAgIHJldHVybiBodHRwLnBvc3Qoe1xuXHRcdFwidXJsXCI6IG15dXJsLFxuXHRcdFwiYm9keVwiIDogZGF0YVxuXHQgICAgfSlcblx0fVxuXHRyZXR1cm4gaHR0cC5nZXQoe1xuXHQgICAgXCJ1cmxcIjogbXl1cmxcblx0fSk7XG4gICAgfSk7XG4gICAgLy8gYXBpLm1ldGhvZCAoJ2NhbGwnLCBmdW5jdGlvbiAob2JqKSB7XG4gICAgLy8gXHR2YXIgdXJsID0gb2JqLnVybDtcbiAgICAvLyBcdHZhciBvbl9zdWNjZXNzID0gb2JqLnN1Y2Nlc3M7XG4gICAgLy8gXHR2YXIgb25fZXJyb3IgICA9IG9iai5lcnJvcjtcbiAgICAvLyBcdGNvbm5lY3Rpb25zKys7XG4gICAgLy8gXHRodHRwLmdldCh7XG4gICAgLy8gXHQgICAgXCJ1cmxcIiA6IHVybFxuICAgIC8vIFx0fSwgZnVuY3Rpb24gKGVycm9yLCByZXNwKSB7XG4gICAgLy8gXHQgICAgaWYgKHJlc3AgIT09IHVuZGVmaW5lZCAmJiBlcnJvciA9PSBudWxsICYmIG9uX3N1Y2Nlc3MgIT09IHVuZGVmaW5lZCkge1xuICAgIC8vIFx0XHRvbl9zdWNjZXNzKEpTT04ucGFyc2UocmVzcC5ib2R5KSk7XG4gICAgLy8gXHQgICAgfVxuICAgIC8vIFx0ICAgIGlmIChlcnJvciAhPT0gbnVsbCAmJiBvbl9lcnJvciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgLy8gXHRcdG9uX2Vycm9yKGVycm9yKTtcbiAgICAvLyBcdCAgICB9XG4gICAgLy8gXHR9KTtcbiAgICAvLyB9KTtcblxuXG4gICAgZVJlc3QudXJsID0ge307XG4gICAgdmFyIHVybF9hcGkgPSBhcGlqcyAoZVJlc3QudXJsKTtcblx0LyoqIGVSZXN0LnVybC48c3Ryb25nPnJlZ2lvbjwvc3Ryb25nPiByZXR1cm5zIHRoZSBlbnNlbWJsIFJFU1QgdXJsIHRvIHJldHJpZXZlIHRoZSBnZW5lcyBpbmNsdWRlZCBpbiB0aGUgc3BlY2lmaWVkIHJlZ2lvblxuXHQgICAgQHBhcmFtIHtvYmplY3R9IG9iaiAtIEFuIG9iamVjdCBsaXRlcmFsIHdpdGggdGhlIGZvbGxvd2luZyBmaWVsZHM6PGJyIC8+XG48dWw+XG48bGk+c3BlY2llcyA6IFRoZSBzcGVjaWVzIHRoZSByZWdpb24gcmVmZXJzIHRvPC9saT5cbjxsaT5jaHIgICAgIDogVGhlIGNociAob3Igc2VxX3JlZ2lvbiBuYW1lKTwvbGk+XG48bGk+ZnJvbSAgICA6IFRoZSBzdGFydCBwb3NpdGlvbiBvZiB0aGUgcmVnaW9uIGluIHRoZSBjaHI8L2xpPlxuPGxpPnRvICAgICAgOiBUaGUgZW5kIHBvc2l0aW9uIG9mIHRoZSByZWdpb24gKGZyb20gPCB0byBhbHdheXMpPC9saT5cbjwvdWw+XG4gICAgICAgICAgICBAcmV0dXJucyB7c3RyaW5nfSAtIFRoZSB1cmwgdG8gcXVlcnkgdGhlIEVuc2VtYmwgUkVTVCBzZXJ2ZXIuIEZvciBhbiBleGFtcGxlIG9mIG91dHB1dCBvZiB0aGVzZSB1cmxzIHNlZSB0aGUge0BsaW5rIGh0dHA6Ly9iZXRhLnJlc3QuZW5zZW1ibC5vcmcvZmVhdHVyZS9yZWdpb24vaG9tb19zYXBpZW5zLzEzOjMyODg5NjExLTMyOTczODA1Lmpzb24/ZmVhdHVyZT1nZW5lfEVuc2VtYmwgUkVTVCBBUEkgZXhhbXBsZX1cblx0ICAgIEBleGFtcGxlXG5lUmVzdC5jYWxsICggdXJsICAgICA6IGVSZXN0LnVybC5yZWdpb24gKHsgc3BlY2llcyA6IFwiaG9tb19zYXBpZW5zXCIsIGNociA6IFwiMTNcIiwgZnJvbSA6IDMyODg5NjExLCB0byA6IDMyOTczODA1IH0pLFxuICAgICAgICAgICAgIHN1Y2Nlc3MgOiBjYWxsYmFjayxcbiAgICAgICAgICAgICBlcnJvciAgIDogY2FsbGJhY2tcblx0ICAgKTtcblx0ICovXG4gICAgIHVybF9hcGkubWV0aG9kICgncmVnaW9uJywgZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgICB2YXIgcHJlZml4X3JlZ2lvbiA9IFwiL292ZXJsYXAvcmVnaW9uL1wiO1xuICAgICAgICAgdmFyIGZlYXR1cmVzID0gb2JqLmZlYXR1cmVzIHx8IFtcImdlbmVcIl07XG4gICAgICAgICB2YXIgZmVhdHVyZV9vcHRpb25zID0gZmVhdHVyZXMubWFwIChmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgIHJldHVybiBcImZlYXR1cmU9XCIgKyBkO1xuICAgICAgICAgfSk7XG4gICAgICAgICB2YXIgZmVhdHVyZV9vcHRpb25zX3VybCA9IGZlYXR1cmVfb3B0aW9ucy5qb2luKFwiJlwiKTtcbiAgICAgICAgIHJldHVybiBjb25maWcucHJveHlVcmwgKyBwcmVmaXhfcmVnaW9uICtcbiAgICAgICAgIG9iai5zcGVjaWVzICtcbiAgICAgICAgIFwiL1wiICtcbiAgICAgICAgIG9iai5jaHIgK1xuICAgICAgICAgXCI6XCIgK1xuICAgICAgICAgb2JqLmZyb20gK1xuICAgICAgICAgXCItXCIgKyBvYmoudG8gK1xuICAgICAgICAgLy9cIi5qc29uP2ZlYXR1cmU9Z2VuZVwiO1xuICAgICAgICAgXCIuanNvbj9cIiArIGZlYXR1cmVfb3B0aW9uc191cmw7XG4gICAgIH0pO1xuXG5cdC8qKiBlUmVzdC51cmwuPHN0cm9uZz5zcGVjaWVzX2dlbmU8L3N0cm9uZz4gcmV0dXJucyB0aGUgZW5zZW1ibCBSRVNUIHVybCB0byByZXRyaWV2ZSB0aGUgZW5zZW1ibCBnZW5lIGFzc29jaWF0ZWQgd2l0aFxuXHQgICAgdGhlIGdpdmVuIG5hbWUgaW4gdGhlIHNwZWNpZmllZCBzcGVjaWVzLlxuXHQgICAgQHBhcmFtIHtvYmplY3R9IG9iaiAtIEFuIG9iamVjdCBsaXRlcmFsIHdpdGggdGhlIGZvbGxvd2luZyBmaWVsZHM6PGJyIC8+XG48dWw+XG48bGk+c3BlY2llcyAgIDogVGhlIHNwZWNpZXMgdGhlIHJlZ2lvbiByZWZlcnMgdG88L2xpPlxuPGxpPmdlbmVfbmFtZSA6IFRoZSBuYW1lIG9mIHRoZSBnZW5lPC9saT5cbjwvdWw+XG4gICAgICAgICAgICBAcmV0dXJucyB7c3RyaW5nfSAtIFRoZSB1cmwgdG8gcXVlcnkgdGhlIEVuc2VtYmwgUkVTVCBzZXJ2ZXIuIEZvciBhbiBleGFtcGxlIG9mIG91dHB1dCBvZiB0aGVzZSB1cmxzIHNlZSB0aGUge0BsaW5rIGh0dHA6Ly9iZXRhLnJlc3QuZW5zZW1ibC5vcmcveHJlZnMvc3ltYm9sL2h1bWFuL0JSQ0EyLmpzb24/b2JqZWN0X3R5cGU9Z2VuZXxFbnNlbWJsIFJFU1QgQVBJIGV4YW1wbGV9XG5cdCAgICBAZXhhbXBsZVxuZVJlc3QuY2FsbCAoIHVybCAgICAgOiBlUmVzdC51cmwuc3BlY2llc19nZW5lICh7IHNwZWNpZXMgOiBcImh1bWFuXCIsIGdlbmVfbmFtZSA6IFwiQlJDQTJcIiB9KSxcbiAgICAgICAgICAgICBzdWNjZXNzIDogY2FsbGJhY2ssXG4gICAgICAgICAgICAgZXJyb3IgICA6IGNhbGxiYWNrXG5cdCAgICk7XG5cdCAqL1xuICAgIHVybF9hcGkubWV0aG9kICgneHJlZicsIGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgdmFyIHByZWZpeF94cmVmID0gXCIveHJlZnMvc3ltYm9sL1wiO1xuICAgICAgICByZXR1cm4gY29uZmlnLnByb3h5VXJsICsgcHJlZml4X3hyZWYgK1xuICAgICAgICAgICAgb2JqLnNwZWNpZXMgICtcbiAgICAgICAgICAgIFwiL1wiICtcbiAgICAgICAgICAgIG9iai5uYW1lICtcbiAgICAgICAgICAgIFwiLmpzb24/b2JqZWN0X3R5cGU9Z2VuZVwiO1xuICAgIH0pO1xuXG5cdC8qKiBlUmVzdC51cmwuPHN0cm9uZz5ob21vbG9ndWVzPC9zdHJvbmc+IHJldHVybnMgdGhlIGVuc2VtYmwgUkVTVCB1cmwgdG8gcmV0cmlldmUgdGhlIGhvbW9sb2d1ZXMgKG9ydGhvbG9ndWVzICsgcGFyYWxvZ3Vlcykgb2YgdGhlIGdpdmVuIGVuc2VtYmwgSUQuXG5cdCAgICBAcGFyYW0ge29iamVjdH0gb2JqIC0gQW4gb2JqZWN0IGxpdGVyYWwgd2l0aCB0aGUgZm9sbG93aW5nIGZpZWxkczo8YnIgLz5cbjx1bD5cbjxsaT5pZCA6IFRoZSBFbnNlbWJsIElEIG9mIHRoZSBnZW5lPC9saT5cbjwvdWw+XG4gICAgICAgICAgICBAcmV0dXJucyB7c3RyaW5nfSAtIFRoZSB1cmwgdG8gcXVlcnkgdGhlIEVuc2VtYmwgUkVTVCBzZXJ2ZXIuIEZvciBhbiBleGFtcGxlIG9mIG91dHB1dCBvZiB0aGVzZSB1cmxzIHNlZSB0aGUge0BsaW5rIGh0dHA6Ly9iZXRhLnJlc3QuZW5zZW1ibC5vcmcvaG9tb2xvZ3kvaWQvRU5TRzAwMDAwMTM5NjE4Lmpzb24/Zm9ybWF0PWNvbmRlbnNlZDtzZXF1ZW5jZT1ub25lO3R5cGU9YWxsfEVuc2VtYmwgUkVTVCBBUEkgZXhhbXBsZX1cblx0ICAgIEBleGFtcGxlXG5lUmVzdC5jYWxsICggdXJsICAgICA6IGVSZXN0LnVybC5ob21vbG9ndWVzICh7IGlkIDogXCJFTlNHMDAwMDAxMzk2MThcIiB9KSxcbiAgICAgICAgICAgICBzdWNjZXNzIDogY2FsbGJhY2ssXG4gICAgICAgICAgICAgZXJyb3IgICA6IGNhbGxiYWNrXG5cdCAgICk7XG5cdCAqL1xuICAgIHVybF9hcGkubWV0aG9kICgnaG9tb2xvZ3VlcycsIGZ1bmN0aW9uKG9iaikge1xuICAgICAgICB2YXIgcHJlZml4X2hvbW9sb2d1ZXMgPSBcIi9ob21vbG9neS9pZC9cIjtcbiAgICAgICAgcmV0dXJuIGNvbmZpZy5wcm94eVVybCArIHByZWZpeF9ob21vbG9ndWVzICtcbiAgICAgICAgICAgIG9iai5pZCArXG4gICAgICAgICAgICBcIi5qc29uP2Zvcm1hdD1jb25kZW5zZWQ7c2VxdWVuY2U9bm9uZTt0eXBlPWFsbFwiO1xuICAgIH0pO1xuXG5cdC8qKiBlUmVzdC51cmwuPHN0cm9uZz5nZW5lPC9zdHJvbmc+IHJldHVybnMgdGhlIGVuc2VtYmwgUkVTVCB1cmwgdG8gcmV0cmlldmUgdGhlIGVuc2VtYmwgZ2VuZSBhc3NvY2lhdGVkIHdpdGhcblx0ICAgIHRoZSBnaXZlbiBJRFxuXHQgICAgQHBhcmFtIHtvYmplY3R9IG9iaiAtIEFuIG9iamVjdCBsaXRlcmFsIHdpdGggdGhlIGZvbGxvd2luZyBmaWVsZHM6PGJyIC8+XG48dWw+XG48bGk+aWQgOiBUaGUgbmFtZSBvZiB0aGUgZ2VuZTwvbGk+XG48bGk+ZXhwYW5kIDogaWYgdHJhbnNjcmlwdHMgc2hvdWxkIGJlIGluY2x1ZGVkIGluIHRoZSByZXNwb25zZSAoZGVmYXVsdCB0byAwKTwvbGk+XG48L3VsPlxuICAgICAgICAgICAgQHJldHVybnMge3N0cmluZ30gLSBUaGUgdXJsIHRvIHF1ZXJ5IHRoZSBFbnNlbWJsIFJFU1Qgc2VydmVyLiBGb3IgYW4gZXhhbXBsZSBvZiBvdXRwdXQgb2YgdGhlc2UgdXJscyBzZWUgdGhlIHtAbGluayBodHRwOi8vYmV0YS5yZXN0LmVuc2VtYmwub3JnL2xvb2t1cC9FTlNHMDAwMDAxMzk2MTguanNvbj9mb3JtYXQ9ZnVsbHxFbnNlbWJsIFJFU1QgQVBJIGV4YW1wbGV9XG5cdCAgICBAZXhhbXBsZVxuZVJlc3QuY2FsbCAoIHVybCAgICAgOiBlUmVzdC51cmwuZ2VuZSAoeyBpZCA6IFwiRU5TRzAwMDAwMTM5NjE4XCIgfSksXG4gICAgICAgICAgICAgc3VjY2VzcyA6IGNhbGxiYWNrLFxuICAgICAgICAgICAgIGVycm9yICAgOiBjYWxsYmFja1xuXHQgICApO1xuXHQgKi9cbiAgICB1cmxfYXBpLm1ldGhvZCAoJ2dlbmUnLCBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgdmFyIHByZWZpeF9lbnNnZW5lID0gXCIvbG9va3VwL2lkL1wiO1xuICAgICAgICB2YXIgdXJsID0gY29uZmlnLnByb3h5VXJsICsgcHJlZml4X2Vuc2dlbmUgKyBvYmouaWQgKyBcIi5qc29uP2Zvcm1hdD1mdWxsXCI7XG4gICAgICAgIGlmIChvYmouZXhwYW5kICYmIG9iai5leHBhbmQgPT09IDEpIHtcbiAgICAgICAgICAgIHVybCA9IHVybCArIFwiJmV4cGFuZD0xXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVybDtcbiAgICB9KTtcblxuXHQvKiogZVJlc3QudXJsLjxzdHJvbmc+Y2hyX2luZm88L3N0cm9uZz4gcmV0dXJucyB0aGUgZW5zZW1ibCBSRVNUIHVybCB0byByZXRyaWV2ZSB0aGUgaW5mb3JtYXRpb24gYXNzb2NpYXRlZCB3aXRoIHRoZSBjaHJvbW9zb21lIChzZXFfcmVnaW9uIGluIEVuc2VtYmwgbm9tZW5jbGF0dXJlKS5cblx0ICAgIEBwYXJhbSB7b2JqZWN0fSBvYmogLSBBbiBvYmplY3QgbGl0ZXJhbCB3aXRoIHRoZSBmb2xsb3dpbmcgZmllbGRzOjxiciAvPlxuPHVsPlxuPGxpPnNwZWNpZXMgOiBUaGUgc3BlY2llcyB0aGUgY2hyIChvciBzZXFfcmVnaW9uKSBiZWxvbmdzIHRvXG48bGk+Y2hyICAgICA6IFRoZSBuYW1lIG9mIHRoZSBjaHIgKG9yIHNlcV9yZWdpb24pPC9saT5cbjwvdWw+XG4gICAgICAgICAgICBAcmV0dXJucyB7c3RyaW5nfSAtIFRoZSB1cmwgdG8gcXVlcnkgdGhlIEVuc2VtYmwgUkVTVCBzZXJ2ZXIuIEZvciBhbiBleGFtcGxlIG9mIG91dHB1dCBvZiB0aGVzZSB1cmxzIHNlZSB0aGUge0BsaW5rIGh0dHA6Ly9iZXRhLnJlc3QuZW5zZW1ibC5vcmcvYXNzZW1ibHkvaW5mby9ob21vX3NhcGllbnMvMTMuanNvbj9mb3JtYXQ9ZnVsbHxFbnNlbWJsIFJFU1QgQVBJIGV4YW1wbGV9XG5cdCAgICBAZXhhbXBsZVxuZVJlc3QuY2FsbCAoIHVybCAgICAgOiBlUmVzdC51cmwuY2hyX2luZm8gKHsgc3BlY2llcyA6IFwiaG9tb19zYXBpZW5zXCIsIGNociA6IFwiMTNcIiB9KSxcbiAgICAgICAgICAgICBzdWNjZXNzIDogY2FsbGJhY2ssXG4gICAgICAgICAgICAgZXJyb3IgICA6IGNhbGxiYWNrXG5cdCAgICk7XG5cdCAqL1xuICAgIHVybF9hcGkubWV0aG9kICgnY2hyX2luZm8nLCBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgdmFyIHByZWZpeF9jaHJfaW5mbyA9IFwiL2luZm8vYXNzZW1ibHkvXCI7XG4gICAgICAgIHJldHVybiBjb25maWcucHJveHlVcmwgKyBwcmVmaXhfY2hyX2luZm8gK1xuICAgICAgICAgICAgb2JqLnNwZWNpZXMgK1xuICAgICAgICAgICAgXCIvXCIgK1xuICAgICAgICAgICAgb2JqLmNociArXG4gICAgICAgICAgICBcIi5qc29uP2Zvcm1hdD1mdWxsXCI7XG4gICAgfSk7XG5cblx0Ly8gVE9ETzogRm9yIG5vdywgaXQgb25seSB3b3JrcyB3aXRoIHNwZWNpZXNfc2V0IGFuZCBub3Qgc3BlY2llc19zZXRfZ3JvdXBzXG5cdC8vIFNob3VsZCBiZSBleHRlbmRlZCBmb3Igd2lkZXIgdXNlXG4gICAgdXJsX2FwaS5tZXRob2QgKCdhbG5fYmxvY2snLCBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIHZhciBwcmVmaXhfYWxuX3JlZ2lvbiA9IFwiL2FsaWdubWVudC9yZWdpb24vXCI7XG4gICAgICAgIHZhciB1cmwgPSBjb25maWcucHJveHlVcmwgKyBwcmVmaXhfYWxuX3JlZ2lvbiArXG4gICAgICAgICAgICBvYmouc3BlY2llcyArXG4gICAgICAgICAgICBcIi9cIiArXG4gICAgICAgICAgICBvYmouY2hyICtcbiAgICAgICAgICAgIFwiOlwiICtcbiAgICAgICAgICAgIG9iai5mcm9tICtcbiAgICAgICAgICAgIFwiLVwiICtcbiAgICAgICAgICAgIG9iai50byArXG4gICAgICAgICAgICBcIi5qc29uP21ldGhvZD1cIiArXG4gICAgICAgICAgICBvYmoubWV0aG9kO1xuXG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxvYmouc3BlY2llc19zZXQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHVybCArPSBcIiZzcGVjaWVzX3NldD1cIiArIG9iai5zcGVjaWVzX3NldFtpXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB1cmw7XG4gICAgfSk7XG5cbiAgICB1cmxfYXBpLm1ldGhvZCAoJ3NlcXVlbmNlJywgZnVuY3Rpb24gKG9iaikge1xuICAgICAgICB2YXIgcHJlZml4X3NlcXVlbmNlID0gXCIvc2VxdWVuY2UvcmVnaW9uL1wiO1xuICAgICAgICByZXR1cm4gY29uZmlnLnByb3h5VXJsICsgcHJlZml4X3NlcXVlbmNlICtcbiAgICAgICAgICAgIG9iai5zcGVjaWVzICtcbiAgICAgICAgICAgICcvJyArXG4gICAgICAgICAgICBvYmouY2hyICtcbiAgICAgICAgICAgICc6JyArXG4gICAgICAgICAgICBvYmouZnJvbSArXG4gICAgICAgICAgICAnLi4nICtcbiAgICAgICAgICAgIG9iai50byArXG4gICAgICAgICAgICAnP2NvbnRlbnQtdHlwZT1hcHBsaWNhdGlvbi9qc29uJztcbiAgICB9KTtcblxuICAgIHVybF9hcGkubWV0aG9kICgndmFyaWF0aW9uJywgZnVuY3Rpb24gKG9iaikge1xuXHQvLyBGb3Igbm93LCBvbmx5IHBvc3QgcmVxdWVzdHMgYXJlIGluY2x1ZGVkXG4gICAgICAgIHZhciBwcmVmaXhfdmFyaWF0aW9uID0gXCIvdmFyaWF0aW9uL1wiO1xuICAgICAgICByZXR1cm4gY29uZmlnLnByb3h5VXJsICsgcHJlZml4X3ZhcmlhdGlvbiArXG4gICAgICAgICAgICBvYmouc3BlY2llcztcbiAgICAgICAgfSk7XG5cbiAgICB1cmxfYXBpLm1ldGhvZCAoJ2dlbmVfdHJlZScsIGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgdmFyIHByZWZpeF9nZW5lX3RyZWUgPSBcIi9nZW5ldHJlZS9pZC9cIjtcbiAgICAgICAgcmV0dXJuIGNvbmZpZy5wcm94eVVybCArIHByZWZpeF9nZW5lX3RyZWUgK1xuICAgICAgICAgICAgb2JqLmlkICtcbiAgICAgICAgICAgIFwiLmpzb24/c2VxdWVuY2U9XCIgK1xuICAgICAgICAgICAgKChvYmouc2VxdWVuY2UgfHwgb2JqLmFsaWduZWQpID8gMSA6IFwibm9uZVwiKSArXG4gICAgICAgICAgICAob2JqLmFsaWduZWQgPyAnJmFsaWduZWQ9MScgOiAnJyk7XG4gICAgfSk7XG5cbiAgICB1cmxfYXBpLm1ldGhvZCgnYXNzZW1ibHknLCBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIHZhciBwcmVmaXhfYXNzZW1ibHkgPSBcIi9pbmZvL2Fzc2VtYmx5L1wiO1xuICAgICAgICByZXR1cm4gY29uZmlnLnByb3h5VXJsICsgcHJlZml4X2Fzc2VtYmx5ICtcbiAgICAgICAgICAgIG9iai5zcGVjaWVzICtcbiAgICAgICAgICAgIFwiLmpzb25cIjtcbiAgICAgICAgfSk7XG5cblxuICAgIGFwaS5tZXRob2QgKCdjb25uZWN0aW9ucycsIGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gY29ubmVjdGlvbnM7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZVJlc3Q7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSB0bnRfZVJlc3Q7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHRvb2x0aXAgPSByZXF1aXJlKFwiLi9zcmMvdG9vbHRpcC5qc1wiKTtcbiIsInZhciBhcGlqcyA9IHJlcXVpcmUoXCJ0bnQuYXBpXCIpO1xuXG52YXIgdG9vbHRpcCA9IGZ1bmN0aW9uICgpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIHZhciBkcmFnID0gZDMuYmVoYXZpb3IuZHJhZygpO1xuICAgIHZhciB0b29sdGlwX2RpdjtcblxuICAgIHZhciBjb25mID0ge1xuXHRwb3NpdGlvbiA6IFwicmlnaHRcIixcblx0YWxsb3dfZHJhZyA6IHRydWUsXG5cdHNob3dfY2xvc2VyIDogdHJ1ZSxcblx0ZmlsbCA6IGZ1bmN0aW9uICgpIHsgdGhyb3cgXCJmaWxsIGlzIG5vdCBkZWZpbmVkIGluIHRoZSBiYXNlIG9iamVjdFwiOyB9LFxuXHR3aWR0aCA6IDE4MCxcblx0aWQgOiAxXG4gICAgfTtcblxuICAgIHZhciB0ID0gZnVuY3Rpb24gKGRhdGEsIGV2ZW50KSB7XG5cdGRyYWdcblx0ICAgIC5vcmlnaW4oZnVuY3Rpb24oKXtcblx0XHRyZXR1cm4ge3g6cGFyc2VJbnQoZDMuc2VsZWN0KHRoaXMpLnN0eWxlKFwibGVmdFwiKSksXG5cdFx0XHR5OnBhcnNlSW50KGQzLnNlbGVjdCh0aGlzKS5zdHlsZShcInRvcFwiKSlcblx0XHQgICAgICAgfTtcblx0ICAgIH0pXG5cdCAgICAub24oXCJkcmFnXCIsIGZ1bmN0aW9uKCkge1xuXHRcdGlmIChjb25mLmFsbG93X2RyYWcpIHtcblx0XHQgICAgZDMuc2VsZWN0KHRoaXMpXG5cdFx0XHQuc3R5bGUoXCJsZWZ0XCIsIGQzLmV2ZW50LnggKyBcInB4XCIpXG5cdFx0XHQuc3R5bGUoXCJ0b3BcIiwgZDMuZXZlbnQueSArIFwicHhcIik7XG5cdFx0fVxuXHQgICAgfSk7XG5cblx0Ly8gVE9ETzogV2h5IGRvIHdlIG5lZWQgdGhlIGRpdiBlbGVtZW50P1xuXHQvLyBJdCBsb29rcyBsaWtlIGlmIHdlIGFuY2hvciB0aGUgdG9vbHRpcCBpbiB0aGUgXCJib2R5XCJcblx0Ly8gVGhlIHRvb2x0aXAgaXMgbm90IGxvY2F0ZWQgaW4gdGhlIHJpZ2h0IHBsYWNlIChhcHBlYXJzIGF0IHRoZSBib3R0b20pXG5cdC8vIFNlZSBjbGllbnRzL3Rvb2x0aXBzX3Rlc3QuaHRtbCBmb3IgYW4gZXhhbXBsZVxuXHR2YXIgY29udGFpbmVyRWxlbSA9IHNlbGVjdEFuY2VzdG9yICh0aGlzLCBcImRpdlwiKTtcblx0aWYgKGNvbnRhaW5lckVsZW0gPT09IHVuZGVmaW5lZCkge1xuXHQgICAgLy8gV2UgcmVxdWlyZSBhIGRpdiBlbGVtZW50IGF0IHNvbWUgcG9pbnQgdG8gYW5jaG9yIHRoZSB0b29sdGlwXG5cdCAgICByZXR1cm47XG5cdH1cblxuXHR0b29sdGlwX2RpdiA9IGQzLnNlbGVjdChjb250YWluZXJFbGVtKVxuXHQgICAgLmFwcGVuZChcImRpdlwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF90b29sdGlwXCIpXG5cdCAgICAuY2xhc3NlZChcInRudF90b29sdGlwX2FjdGl2ZVwiLCB0cnVlKSAgLy8gVE9ETzogSXMgdGhpcyBuZWVkZWQvdXNlZD8/P1xuXHQgICAgLmNhbGwoZHJhZyk7XG5cblx0Ly8gcHJldiB0b29sdGlwcyB3aXRoIHRoZSBzYW1lIGhlYWRlclxuXHRkMy5zZWxlY3QoXCIjdG50X3Rvb2x0aXBfXCIgKyBjb25mLmlkKS5yZW1vdmUoKTtcblxuXHRpZiAoKGQzLmV2ZW50ID09PSBudWxsKSAmJiAoZXZlbnQpKSB7XG5cdCAgICBkMy5ldmVudCA9IGV2ZW50O1xuXHR9XG5cdHZhciBkM21vdXNlID0gZDMubW91c2UoY29udGFpbmVyRWxlbSk7XG5cdGQzLmV2ZW50ID0gbnVsbDtcblxuXHR2YXIgb2Zmc2V0ID0gMDtcblx0aWYgKGNvbmYucG9zaXRpb24gPT09IFwibGVmdFwiKSB7XG5cdCAgICBvZmZzZXQgPSBjb25mLndpZHRoO1xuXHR9XG5cblx0dG9vbHRpcF9kaXYuYXR0cihcImlkXCIsIFwidG50X3Rvb2x0aXBfXCIgKyBjb25mLmlkKTtcblxuXHQvLyBXZSBwbGFjZSB0aGUgdG9vbHRpcFxuXHR0b29sdGlwX2RpdlxuXHQgICAgLnN0eWxlKFwibGVmdFwiLCAoZDNtb3VzZVswXSkgKyBcInB4XCIpXG5cdCAgICAuc3R5bGUoXCJ0b3BcIiwgKGQzbW91c2VbMV0pICsgXCJweFwiKTtcblxuXHQvLyBDbG9zZVxuICAgIGlmIChjb25mLnNob3dfY2xvc2VyKSB7XG4gICAgICAgIHRvb2x0aXBfZGl2XG4gICAgICAgICAgICAuYXBwZW5kKFwiZGl2XCIpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3Rvb2x0aXBfY2xvc2VyXCIpXG4gICAgICAgICAgICAub24gKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHQuY2xvc2UoKTtcbiAgICAgICAgICAgIH0pXG4gICAgfVxuXG5cdGNvbmYuZmlsbC5jYWxsKHRvb2x0aXBfZGl2LCBkYXRhKTtcblxuXHQvLyByZXR1cm4gdGhpcyBoZXJlP1xuXHRyZXR1cm4gdDtcbiAgICB9O1xuXG4gICAgLy8gZ2V0cyB0aGUgZmlyc3QgYW5jZXN0b3Igb2YgZWxlbSBoYXZpbmcgdGFnbmFtZSBcInR5cGVcIlxuICAgIC8vIGV4YW1wbGUgOiB2YXIgbXlkaXYgPSBzZWxlY3RBbmNlc3RvcihteWVsZW0sIFwiZGl2XCIpO1xuICAgIGZ1bmN0aW9uIHNlbGVjdEFuY2VzdG9yIChlbGVtLCB0eXBlKSB7XG5cdHR5cGUgPSB0eXBlLnRvTG93ZXJDYXNlKCk7XG5cdGlmIChlbGVtLnBhcmVudE5vZGUgPT09IG51bGwpIHtcblx0ICAgIGNvbnNvbGUubG9nKFwiTm8gbW9yZSBwYXJlbnRzXCIpO1xuXHQgICAgcmV0dXJuIHVuZGVmaW5lZDtcblx0fVxuXHR2YXIgdGFnTmFtZSA9IGVsZW0ucGFyZW50Tm9kZS50YWdOYW1lO1xuXG5cdGlmICgodGFnTmFtZSAhPT0gdW5kZWZpbmVkKSAmJiAodGFnTmFtZS50b0xvd2VyQ2FzZSgpID09PSB0eXBlKSkge1xuXHQgICAgcmV0dXJuIGVsZW0ucGFyZW50Tm9kZTtcblx0fSBlbHNlIHtcblx0ICAgIHJldHVybiBzZWxlY3RBbmNlc3RvciAoZWxlbS5wYXJlbnROb2RlLCB0eXBlKTtcblx0fVxuICAgIH1cblxuICAgIHZhciBhcGkgPSBhcGlqcyh0KVxuXHQuZ2V0c2V0KGNvbmYpO1xuICAgIGFwaS5jaGVjaygncG9zaXRpb24nLCBmdW5jdGlvbiAodmFsKSB7XG5cdHJldHVybiAodmFsID09PSAnbGVmdCcpIHx8ICh2YWwgPT09ICdyaWdodCcpO1xuICAgIH0sIFwiT25seSAnbGVmdCcgb3IgJ3JpZ2h0JyB2YWx1ZXMgYXJlIGFsbG93ZWQgZm9yIHBvc2l0aW9uXCIpO1xuXG4gICAgYXBpLm1ldGhvZCgnY2xvc2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0b29sdGlwX2Rpdikge1xuICAgICAgICAgICAgdG9vbHRpcF9kaXYucmVtb3ZlKCk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiB0O1xufTtcblxudG9vbHRpcC5saXN0ID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIGxpc3QgdG9vbHRpcCBpcyBiYXNlZCBvbiBnZW5lcmFsIHRvb2x0aXBzXG4gICAgdmFyIHQgPSB0b29sdGlwKCk7XG4gICAgdmFyIHdpZHRoID0gMTgwO1xuXG4gICAgdC5maWxsIChmdW5jdGlvbiAob2JqKSB7XG5cdHZhciB0b29sdGlwX2RpdiA9IHRoaXM7XG5cdHZhciBvYmpfaW5mb19saXN0ID0gdG9vbHRpcF9kaXZcblx0ICAgIC5hcHBlbmQoXCJ0YWJsZVwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF96bWVudVwiKVxuXHQgICAgLmF0dHIoXCJib3JkZXJcIiwgXCJzb2xpZFwiKVxuXHQgICAgLnN0eWxlKFwid2lkdGhcIiwgdC53aWR0aCgpICsgXCJweFwiKTtcblxuXHQvLyBUb29sdGlwIGhlYWRlclxuICAgIGlmIChvYmouaGVhZGVyKSB7XG4gICAgICAgIG9ial9pbmZvX2xpc3Rcblx0ICAgICAgIC5hcHBlbmQoXCJ0clwiKVxuXHQgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF96bWVudV9oZWFkZXJcIilcbiAgICAgICAgICAgLmFwcGVuZChcInRoXCIpXG4gICAgICAgICAgIC50ZXh0KG9iai5oZWFkZXIpO1xuICAgIH1cblxuXHQvLyBUb29sdGlwIHJvd3Ncblx0dmFyIHRhYmxlX3Jvd3MgPSBvYmpfaW5mb19saXN0LnNlbGVjdEFsbChcIi50bnRfem1lbnVfcm93XCIpXG5cdCAgICAuZGF0YShvYmoucm93cylcblx0ICAgIC5lbnRlcigpXG5cdCAgICAuYXBwZW5kKFwidHJcIilcblx0ICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfem1lbnVfcm93XCIpO1xuXG5cdHRhYmxlX3Jvd3Ncblx0ICAgIC5hcHBlbmQoXCJ0ZFwiKVxuXHQgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLCBcImNlbnRlclwiKVxuXHQgICAgLmh0bWwoZnVuY3Rpb24oZCxpKSB7XG5cdFx0cmV0dXJuIG9iai5yb3dzW2ldLnZhbHVlO1xuXHQgICAgfSlcblx0ICAgIC5lYWNoKGZ1bmN0aW9uIChkKSB7XG5cdFx0aWYgKGQubGluayA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0ICAgIHJldHVybjtcblx0XHR9XG5cdFx0ZDMuc2VsZWN0KHRoaXMpXG5cdFx0ICAgIC5jbGFzc2VkKFwibGlua1wiLCAxKVxuXHRcdCAgICAub24oJ2NsaWNrJywgZnVuY3Rpb24gKGQpIHtcblx0XHRcdGQubGluayhkLm9iaik7XG5cdFx0XHR0LmNsb3NlLmNhbGwodGhpcyk7XG5cdFx0ICAgIH0pO1xuXHQgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHQ7XG59O1xuXG50b29sdGlwLnRhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIHRhYmxlIHRvb2x0aXBzIGFyZSBiYXNlZCBvbiBnZW5lcmFsIHRvb2x0aXBzXG4gICAgdmFyIHQgPSB0b29sdGlwKCk7XG5cbiAgICB2YXIgd2lkdGggPSAxODA7XG5cbiAgICB0LmZpbGwgKGZ1bmN0aW9uIChvYmopIHtcblx0dmFyIHRvb2x0aXBfZGl2ID0gdGhpcztcblxuXHR2YXIgb2JqX2luZm9fdGFibGUgPSB0b29sdGlwX2RpdlxuXHQgICAgLmFwcGVuZChcInRhYmxlXCIpXG5cdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3ptZW51XCIpXG5cdCAgICAuYXR0cihcImJvcmRlclwiLCBcInNvbGlkXCIpXG5cdCAgICAuc3R5bGUoXCJ3aWR0aFwiLCB0LndpZHRoKCkgKyBcInB4XCIpO1xuXG5cdC8vIFRvb2x0aXAgaGVhZGVyXG4gICAgaWYgKG9iai5oZWFkZXIpIHtcbiAgICAgICAgb2JqX2luZm9fdGFibGVcbiAgICAgICAgICAgIC5hcHBlbmQoXCJ0clwiKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF96bWVudV9oZWFkZXJcIilcbiAgICAgICAgICAgIC5hcHBlbmQoXCJ0aFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJjb2xzcGFuXCIsIDIpXG4gICAgICAgICAgICAudGV4dChvYmouaGVhZGVyKTtcbiAgICB9XG5cblx0Ly8gVG9vbHRpcCByb3dzXG5cdHZhciB0YWJsZV9yb3dzID0gb2JqX2luZm9fdGFibGUuc2VsZWN0QWxsKFwiLnRudF96bWVudV9yb3dcIilcblx0ICAgIC5kYXRhKG9iai5yb3dzKVxuXHQgICAgLmVudGVyKClcblx0ICAgIC5hcHBlbmQoXCJ0clwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF96bWVudV9yb3dcIik7XG5cblx0dGFibGVfcm93c1xuXHQgICAgLmFwcGVuZChcInRoXCIpXG5cdCAgICAuYXR0cihcImNvbHNwYW5cIiwgZnVuY3Rpb24gKGQsIGkpIHtcblx0XHRpZiAoZC52YWx1ZSA9PT0gXCJcIikge1xuXHRcdCAgICByZXR1cm4gMjtcblx0XHR9XG5cdFx0cmV0dXJuIDE7XG5cdCAgICB9KVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbiAoZCkge1xuXHRcdGlmIChkLnZhbHVlID09PSBcIlwiKSB7XG5cdFx0ICAgIHJldHVybiBcInRudF96bWVudV9pbm5lcl9oZWFkZXJcIjtcblx0XHR9XG5cdFx0cmV0dXJuIFwidG50X3ptZW51X2NlbGxcIjtcblx0ICAgIH0pXG5cdCAgICAuaHRtbChmdW5jdGlvbihkLGkpIHtcblx0XHRyZXR1cm4gb2JqLnJvd3NbaV0ubGFiZWw7XG5cdCAgICB9KTtcblxuXHR0YWJsZV9yb3dzXG5cdCAgICAuYXBwZW5kKFwidGRcIilcblx0ICAgIC5odG1sKGZ1bmN0aW9uKGQsaSkge1xuXHRcdGlmICh0eXBlb2Ygb2JqLnJvd3NbaV0udmFsdWUgPT09ICdmdW5jdGlvbicpIHtcblx0XHQgICAgb2JqLnJvd3NbaV0udmFsdWUuY2FsbCh0aGlzLCBkKTtcblx0XHR9IGVsc2Uge1xuXHRcdCAgICByZXR1cm4gb2JqLnJvd3NbaV0udmFsdWU7XG5cdFx0fVxuXHQgICAgfSlcblx0ICAgIC5lYWNoKGZ1bmN0aW9uIChkKSB7XG5cdFx0aWYgKGQudmFsdWUgPT09IFwiXCIpIHtcblx0XHQgICAgZDMuc2VsZWN0KHRoaXMpLnJlbW92ZSgpO1xuXHRcdH1cblx0ICAgIH0pXG5cdCAgICAuZWFjaChmdW5jdGlvbiAoZCkge1xuXHRcdGlmIChkLmxpbmsgPT09IHVuZGVmaW5lZCkge1xuXHRcdCAgICByZXR1cm47XG5cdFx0fVxuXHRcdGQzLnNlbGVjdCh0aGlzKVxuXHRcdCAgICAuY2xhc3NlZChcImxpbmtcIiwgMSlcblx0XHQgICAgLm9uKCdjbGljaycsIGZ1bmN0aW9uIChkKSB7XG5cdFx0XHRkLmxpbmsoZC5vYmopO1xuXHRcdFx0dC5jbG9zZS5jYWxsKHRoaXMpO1xuXHRcdCAgICB9KTtcblx0ICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHQ7XG59O1xuXG50b29sdGlwLnBsYWluID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIHBsYWluIHRvb2x0aXBzIGFyZSBiYXNlZCBvbiBnZW5lcmFsIHRvb2x0aXBzXG4gICAgdmFyIHQgPSB0b29sdGlwKCk7XG5cbiAgICB0LmZpbGwgKGZ1bmN0aW9uIChvYmopIHtcblx0dmFyIHRvb2x0aXBfZGl2ID0gdGhpcztcblxuXHR2YXIgb2JqX2luZm9fdGFibGUgPSB0b29sdGlwX2RpdlxuXHQgICAgLmFwcGVuZChcInRhYmxlXCIpXG5cdCAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3ptZW51XCIpXG5cdCAgICAuYXR0cihcImJvcmRlclwiLCBcInNvbGlkXCIpXG5cdCAgICAuc3R5bGUoXCJ3aWR0aFwiLCB0LndpZHRoKCkgKyBcInB4XCIpO1xuXG4gICAgaWYgKG9iai5oZWFkZXIpIHtcbiAgICAgICAgb2JqX2luZm9fdGFibGVcbiAgICAgICAgICAgIC5hcHBlbmQoXCJ0clwiKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF96bWVudV9oZWFkZXJcIilcbiAgICAgICAgICAgIC5hcHBlbmQoXCJ0aFwiKVxuICAgICAgICAgICAgLnRleHQob2JqLmhlYWRlcik7XG4gICAgfVxuXG4gICAgaWYgKG9iai5ib2R5KSB7XG4gICAgICAgIG9ial9pbmZvX3RhYmxlXG4gICAgICAgICAgICAuYXBwZW5kKFwidHJcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfem1lbnVfcm93XCIpXG4gICAgICAgICAgICAuYXBwZW5kKFwidGRcIilcbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIiwgXCJjZW50ZXJcIilcbiAgICAgICAgICAgIC5odG1sKG9iai5ib2R5KTtcbiAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHRvb2x0aXA7XG4iLCJhcmd1bWVudHNbNF1bOV1bMF0uYXBwbHkoZXhwb3J0cyxhcmd1bWVudHMpIiwiYXJndW1lbnRzWzRdWzEwXVswXS5hcHBseShleHBvcnRzLGFyZ3VtZW50cykiLCJcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGl0ZXJhdG9yIDogZnVuY3Rpb24oaW5pdF92YWwpIHtcblx0dmFyIGkgPSBpbml0X3ZhbCB8fCAwO1xuXHR2YXIgaXRlciA9IGZ1bmN0aW9uICgpIHtcblx0ICAgIHJldHVybiBpKys7XG5cdH07XG5cdHJldHVybiBpdGVyO1xuICAgIH0sXG5cbiAgICBzY3JpcHRfcGF0aCA6IGZ1bmN0aW9uIChzY3JpcHRfbmFtZSkgeyAvLyBzY3JpcHRfbmFtZSBpcyB0aGUgZmlsZW5hbWVcblx0dmFyIHNjcmlwdF9zY2FwZWQgPSBzY3JpcHRfbmFtZS5yZXBsYWNlKC9bLVxcL1xcXFxeJCorPy4oKXxbXFxde31dL2csICdcXFxcJCYnKTtcblx0dmFyIHNjcmlwdF9yZSA9IG5ldyBSZWdFeHAoc2NyaXB0X3NjYXBlZCArICckJyk7XG5cdHZhciBzY3JpcHRfcmVfc3ViID0gbmV3IFJlZ0V4cCgnKC4qKScgKyBzY3JpcHRfc2NhcGVkICsgJyQnKTtcblxuXHQvLyBUT0RPOiBUaGlzIHJlcXVpcmVzIHBoYW50b20uanMgb3IgYSBzaW1pbGFyIGhlYWRsZXNzIHdlYmtpdCB0byB3b3JrIChkb2N1bWVudClcblx0dmFyIHNjcmlwdHMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc2NyaXB0Jyk7XG5cdHZhciBwYXRoID0gXCJcIjsgIC8vIERlZmF1bHQgdG8gY3VycmVudCBwYXRoXG5cdGlmKHNjcmlwdHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZm9yKHZhciBpIGluIHNjcmlwdHMpIHtcblx0XHRpZihzY3JpcHRzW2ldLnNyYyAmJiBzY3JpcHRzW2ldLnNyYy5tYXRjaChzY3JpcHRfcmUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzY3JpcHRzW2ldLnNyYy5yZXBsYWNlKHNjcmlwdF9yZV9zdWIsICckMScpO1xuXHRcdH1cbiAgICAgICAgICAgIH1cblx0fVxuXHRyZXR1cm4gcGF0aDtcbiAgICB9LFxuXG4gICAgZGVmZXJfY2FuY2VsIDogZnVuY3Rpb24gKGNiYWssIHRpbWUpIHtcblx0dmFyIHRpY2s7XG5cblx0dmFyIGRlZmVyX2NhbmNlbCA9IGZ1bmN0aW9uICgpIHtcblx0ICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcblx0ICAgIHZhciB0aGF0ID0gdGhpcztcblx0ICAgIGNsZWFyVGltZW91dCh0aWNrKTtcblx0ICAgIHRpY2sgPSBzZXRUaW1lb3V0IChmdW5jdGlvbiAoKSB7XG5cdFx0Y2Jhay5hcHBseSAodGhhdCwgYXJncyk7XG5cdCAgICB9LCB0aW1lKTtcblx0fTtcblxuXHRyZXR1cm4gZGVmZXJfY2FuY2VsO1xuICAgIH1cbn07XG4iLCJ2YXIgYm9hcmQgPSByZXF1aXJlKFwidG50LmJvYXJkXCIpO1xudmFyIGFwaWpzID0gcmVxdWlyZShcInRudC5hcGlcIik7XG4vL3ZhciBlbnNlbWJsUmVzdEFQSSA9IHJlcXVpcmUoXCJ0bnQuZW5zZW1ibFwiKTtcblxuYm9hcmQudHJhY2suZGF0YS5yZXRyaWV2ZXIuZW5zZW1ibCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc3VjY2VzcyA9IFtmdW5jdGlvbiAoKSB7fV07XG4gICAgdmFyIGlnbm9yZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGZhbHNlOyB9O1xuICAgIC8vdmFyIGV4dHJhID0gW107IC8vIGV4dHJhIGZpZWxkcyB0byBiZSBwYXNzZWQgdG8gdGhlIHJlc3QgYXBpXG4gICAgdmFyIGVSZXN0ID0gYm9hcmQudHJhY2suZGF0YS5nZW5vbWUucmVzdDtcbiAgICB2YXIgdXBkYXRlX3RyYWNrID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICB2YXIgZGF0YV9wYXJlbnQgPSB0aGlzO1xuICAgICAgICAvLyBPYmplY3QgaGFzIGxvYyBhbmQgYSBwbHVnLWluIGRlZmluZWQgY2FsbGJhY2tcbiAgICAgICAgdmFyIGxvYyA9IG9iai5sb2M7XG4gICAgICAgIGlmIChPYmplY3Qua2V5cyh1cGRhdGVfdHJhY2suZXh0cmEoKSkubGVuZ3RoKSB7XG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB1cGRhdGVfdHJhY2suZXh0cmEoKTtcbiAgICAgICAgICAgIGZvciAodmFyIGl0ZW0gaW4gZXh0cmEpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXh0cmEuaGFzT3duUHJvcGVydHkoaXRlbSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jW2l0ZW1dID0gZXh0cmFbaXRlbV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciBwbHVnaW5fY2JhayA9IG9iai5vbl9zdWNjZXNzO1xuICAgICAgICB2YXIgdXJsID0gZVJlc3QudXJsW3VwZGF0ZV90cmFjay5lbmRwb2ludCgpXShsb2MpO1xuICAgICAgICBpZiAoaWdub3JlIChsb2MpKSB7XG4gICAgICAgICAgICBkYXRhX3BhcmVudC5lbGVtZW50cyhbXSk7XG4gICAgICAgICAgICBwbHVnaW5fY2JhaygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZVJlc3QuY2FsbCh1cmwpXG4gICAgICAgICAgICAudGhlbiAoZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAvLyBVc2VyIGRlZmluZWRcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8c3VjY2Vzcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbW9kID0gc3VjY2Vzc1tpXShyZXNwLmJvZHkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobW9kKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwLmJvZHkgPSBtb2Q7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZGF0YV9wYXJlbnQuZWxlbWVudHMocmVzcC5ib2R5KTtcblxuICAgICAgICAgICAgICAgIC8vIHBsdWctaW4gZGVmaW5lZFxuICAgICAgICAgICAgICAgIHBsdWdpbl9jYmFrKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgYXBpanMgKHVwZGF0ZV90cmFjaylcbiAgICAuZ2V0c2V0ICgnZW5kcG9pbnQnKVxuICAgIC5nZXRzZXQgKCdleHRyYScsIHt9KVxuXG4gICAgLy8gVE9ETzogV2UgZG9uJ3QgaGF2ZSBhIHdheSBvZiByZXNldHRpbmcgdGhlIHN1Y2Nlc3MgYXJyYXlcbiAgICAvLyBUT0RPOiBTaG91bGQgdGhpcyBhbHNvIGJlIGluY2x1ZGVkIGluIHRoZSBzeW5jIHJldHJpZXZlcj9cbiAgICAvLyBTdGlsbCBub3Qgc3VyZSB0aGlzIGlzIHRoZSBiZXN0IG9wdGlvbiB0byBzdXBwb3J0IG1vcmUgdGhhbiBvbmUgY2FsbGJhY2tcbiAgICB1cGRhdGVfdHJhY2suc3VjY2VzcyA9IGZ1bmN0aW9uIChjYikge1xuICAgICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBzdWNjZXNzO1xuICAgICAgICB9XG4gICAgICAgIHN1Y2Nlc3MucHVzaCAoY2IpO1xuICAgICAgICByZXR1cm4gdXBkYXRlX3RyYWNrO1xuICAgIH07XG5cbiAgICB1cGRhdGVfdHJhY2suaWdub3JlID0gZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGlnbm9yZTtcbiAgICAgICAgfVxuICAgICAgICBpZ25vcmUgPSBjYjtcbiAgICAgICAgcmV0dXJuIHVwZGF0ZV90cmFjaztcbiAgICB9O1xuXG4gICAgcmV0dXJuIHVwZGF0ZV90cmFjaztcbn07XG5cblxuLy8gQSBwcmVkZWZpbmVkIHRyYWNrIGZvciBzZXF1ZW5jZXNcbnZhciBkYXRhX3NlcXVlbmNlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBsaW1pdCA9IDE1MDtcbiAgICB2YXIgdHJhY2tfZGF0YSA9IGJvYXJkLnRyYWNrLmRhdGEoKTtcblxuICAgIHZhciB1cGRhdGVyID0gYm9hcmQudHJhY2suZGF0YS5yZXRyaWV2ZXIuZW5zZW1ibCgpXG4gICAgLmlnbm9yZSAoZnVuY3Rpb24gKGxvYykge1xuICAgICAgICByZXR1cm4gKGxvYy50byAtIGxvYy5mcm9tKSA+IGxpbWl0O1xuICAgIH0pXG4gICAgLmVuZHBvaW50KFwic2VxdWVuY2VcIilcbiAgICAuc3VjY2VzcyAoZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgLy8gR2V0IHRoZSBjb29yZGluYXRlc1xuICAgICAgICB2YXIgZmllbGRzID0gcmVzcC5pZC5zcGxpdChcIjpcIik7XG4gICAgICAgIHZhciBmcm9tID0gZmllbGRzWzNdO1xuICAgICAgICB2YXIgbnRzID0gW107XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxyZXNwLnNlcS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbnRzLnB1c2goe1xuICAgICAgICAgICAgICAgIHBvczogK2Zyb20gKyBpLFxuICAgICAgICAgICAgICAgIHNlcXVlbmNlOiByZXNwLnNlcVtpXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG50cztcbiAgICB9KTtcblxuICAgIHRyYWNrX2RhdGEubGltaXQgPSBmdW5jdGlvbiAobmV3bGltKSB7XG4gICAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGxpbWl0O1xuICAgICAgICB9XG4gICAgICAgIGxpbWl0ID0gbmV3bGltO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgcmV0dXJuIHRyYWNrX2RhdGEudXBkYXRlKHVwZGF0ZXIpO1xufTtcblxuLy8gQSBwcmVkZWZpbmVkIHRyYWNrIGZvciBnZW5lc1xudmFyIGRhdGFfZ2VuZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdXBkYXRlciA9IGJvYXJkLnRyYWNrLmRhdGEucmV0cmlldmVyLmVuc2VtYmwoKVxuICAgIC5lbmRwb2ludCAoXCJyZWdpb25cIilcbiAgICAvLyBUT0RPOiBJZiBzdWNjZXNzIGlzIGRlZmluZWQgaGVyZSwgbWVhbnMgdGhhdCBpdCBjYW4ndCBiZSB1c2VyLWRlZmluZWRcbiAgICAvLyBpcyB0aGF0IGdvb2Q/IGVub3VnaD8gQVBJP1xuICAgIC8vIFVQREFURTogTm93IHN1Y2Nlc3MgaXMgYmFja2VkIHVwIGJ5IGFuIGFycmF5LiBTdGlsbCBkb24ndCBrbm93IGlmIHRoaXMgaXMgdGhlIGJlc3Qgb3B0aW9uXG4gICAgLnN1Y2Nlc3MgKGZ1bmN0aW9uIChnZW5lcykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGdlbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoZ2VuZXNbaV0uc3RyYW5kID09PSAtMSkge1xuICAgICAgICAgICAgICAgIGdlbmVzW2ldLmRpc3BsYXlfbGFiZWwgPSBcIjxcIiArIGdlbmVzW2ldLmV4dGVybmFsX25hbWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGdlbmVzW2ldLmRpc3BsYXlfbGFiZWwgPSBnZW5lc1tpXS5leHRlcm5hbF9uYW1lICsgXCI+XCI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gYm9hcmQudHJhY2suZGF0YSgpLnVwZGF0ZSh1cGRhdGVyKTtcbn07XG5cbnZhciBkYXRhX3RyYW5zY3JpcHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHVwZGF0ZXIgPSBib2FyZC50cmFjay5kYXRhLnJldHJpZXZlci5lbnNlbWJsKClcbiAgICAuZW5kcG9pbnQgKFwicmVnaW9uXCIpXG4gICAgLmV4dHJhICh7XG4gICAgICAgIFwiZmVhdHVyZXNcIiA6IFtcImdlbmVcIiwgXCJ0cmFuc2NyaXB0XCIsIFwiZXhvblwiLCBcImNkc1wiXSxcbiAgICB9KVxuICAgICAuc3VjY2VzcyAoZnVuY3Rpb24gKGVsZW1zKSB7XG4gICAgICAgIHZhciB0cmFuc2NyaXB0cyA9IHt9O1xuICAgICAgICB2YXIgZ2VuZXMgPSB7fTtcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpPGVsZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgZWxlbSA9IGVsZW1zW2ldO1xuICAgICAgICAgICAgc3dpdGNoIChlbGVtLmZlYXR1cmVfdHlwZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgXCJnZW5lXCIgOlxuICAgICAgICAgICAgICAgIGdlbmVzW2VsZW0uaWRdID0gZWxlbTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwidHJhbnNjcmlwdFwiIDpcbiAgICAgICAgICAgICAgICB2YXIgbmV3VHJhbnNjcmlwdCA9IHtcbiAgICAgICAgICAgICAgICAgICAgXCJpZFwiIDogZWxlbS5pZCxcbiAgICAgICAgICAgICAgICAgICAgXCJsYWJlbFwiIDogZWxlbS5leHRlcm5hbF9uYW1lLFxuICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIiA6IGVsZW0uc3RyYW5kID09PSAtMSA/IChcIjxcIiArIGVsZW0uZXh0ZXJuYWxfbmFtZSkgOiAoZWxlbS5leHRlcm5hbF9uYW1lICsgXCI+XCIpLFxuICAgICAgICAgICAgICAgICAgICBcInN0YXJ0XCIgOiBlbGVtLnN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICBcImVuZFwiIDogZWxlbS5lbmQsXG4gICAgICAgICAgICAgICAgICAgIFwic3RyYW5kXCIgOiBlbGVtLnN0cmFuZCxcbiAgICAgICAgICAgICAgICAgICAgXCJnZW5lXCIgOiBnZW5lc1tlbGVtLlBhcmVudF0sXG4gICAgICAgICAgICAgICAgICAgIFwidHJhbnNjcmlwdFwiIDogZWxlbSxcbiAgICAgICAgICAgICAgICAgICAgXCJyYXdFeG9uc1wiIDogW11cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHRyYW5zY3JpcHRzW2VsZW0uaWRdID0gbmV3VHJhbnNjcmlwdDtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgXCJleG9uXCIgOlxuICAgICAgICAgICAgICAgIHZhciBuZXdFeG9uID0ge1xuICAgICAgICAgICAgICAgICAgICBcInRyYW5zY3JpcHRcIiA6IGVsZW0uUGFyZW50LFxuICAgICAgICAgICAgICAgICAgICBcInN0YXJ0XCIgOiBlbGVtLnN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICBcImVuZFwiIDogZWxlbS5lbmRcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHRyYW5zY3JpcHRzW2VsZW0uUGFyZW50XS5yYXdFeG9ucy5wdXNoKG5ld0V4b24pXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIFwiY2RzXCIgOlxuICAgICAgICAgICAgICAgIGlmICh0cmFuc2NyaXB0c1tlbGVtLlBhcmVudF0uVHJhbnNsYXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2NyaXB0c1tlbGVtLlBhcmVudF0uVHJhbnNsYXRpb24gPSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGNkc1N0YXJ0ID0gdHJhbnNjcmlwdHNbZWxlbS5QYXJlbnRdLlRyYW5zbGF0aW9uLnN0YXJ0O1xuICAgICAgICAgICAgICAgIGlmICgoY2RzU3RhcnQgPT09IHVuZGVmaW5lZCkgfHwgKGNkc1N0YXJ0ID4gZWxlbS5zdGFydCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNjcmlwdHNbZWxlbS5QYXJlbnRdLlRyYW5zbGF0aW9uLnN0YXJ0ID0gZWxlbS5zdGFydDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgY2RzRW5kID0gdHJhbnNjcmlwdHNbZWxlbS5QYXJlbnRdLlRyYW5zbGF0aW9uLmVuZDtcbiAgICAgICAgICAgICAgICBpZiAoKGNkc0VuZCA9PT0gdW5kZWZpbmVkKSB8fCAoY2RzRW5kIDwgZWxlbS5lbmQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyYW5zY3JpcHRzW2VsZW0uUGFyZW50XS5UcmFuc2xhdGlvbi5lbmQgPSBlbGVtLmVuZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHRzID0gW107XG4gICAgICAgIGZvciAodmFyIGlkIGluIHRyYW5zY3JpcHRzKSB7XG4gICAgICAgICAgICBpZiAodHJhbnNjcmlwdHMuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICAgICAgICAgICAgdmFyIHQgPSB0cmFuc2NyaXB0c1tpZF07XG4gICAgICAgICAgICAgICAgdmFyIG9iaiA9IGV4b25zVG9FeG9uc0FuZEludHJvbnMgKHRyYW5zZm9ybUV4b25zKHQpLCB0KTtcbiAgICAgICAgICAgICAgICBvYmoubmFtZSA9IFt7XG4gICAgICAgICAgICAgICAgICAgIHBvczogdC5zdGFydCxcbiAgICAgICAgICAgICAgICAgICAgbmFtZSA6IHQubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgc3RyYW5kIDogdC5zdHJhbmQsXG4gICAgICAgICAgICAgICAgICAgIHRyYW5zY3JpcHQgOiB0XG4gICAgICAgICAgICAgICAgfV07XG4gICAgICAgICAgICAgICAgb2JqLmtleSA9ICh0LmlkICsgXCJfXCIgKyBvYmouZXhvbnMubGVuZ3RoKVxuICAgICAgICAgICAgICAgIG9iai5pZCA9IHQuaWQ7XG4gICAgICAgICAgICAgICAgb2JqLmdlbmUgPSB0LmdlbmU7XG4gICAgICAgICAgICAgICAgb2JqLnRyYW5zY3JpcHQgPSB0LnRyYW5zY3JpcHQ7XG4gICAgICAgICAgICAgICAgb2JqLmV4dGVybmFsX25hbWUgPSB0LmxhYmVsO1xuICAgICAgICAgICAgICAgIG9iai5kaXNwbGF5X2xhYmVsID0gdC5uYW1lO1xuICAgICAgICAgICAgICAgIG9iai5zdGFydCA9IHQuc3RhcnQ7XG4gICAgICAgICAgICAgICAgb2JqLmVuZCA9IHQuZW5kO1xuICAgICAgICAgICAgICAgIHRzLnB1c2gob2JqKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cztcblxuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gZXhvbnNUb0V4b25zQW5kSW50cm9ucyAoZXhvbnMsIHQpIHtcbiAgICAgICAgdmFyIG9iaiA9IHt9O1xuICAgICAgICBvYmouZXhvbnMgPSBleG9ucztcbiAgICAgICAgb2JqLmludHJvbnMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpPGV4b25zLmxlbmd0aC0xOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBpbnRyb24gPSB7XG4gICAgICAgICAgICAgICAgc3RhcnQgOiBleG9uc1tpXS50cmFuc2NyaXB0LnN0cmFuZCA9PT0gMSA/IGV4b25zW2ldLmVuZCA6IGV4b25zW2ldLnN0YXJ0LFxuICAgICAgICAgICAgICAgIGVuZCAgIDogZXhvbnNbaV0udHJhbnNjcmlwdC5zdHJhbmQgPT09IDEgPyBleG9uc1tpKzFdLnN0YXJ0IDogZXhvbnNbaSsxXS5lbmQsXG4gICAgICAgICAgICAgICAgdHJhbnNjcmlwdCA6IHRcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBvYmouaW50cm9ucy5wdXNoKGludHJvbik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIHRyYW5zZm9ybUV4b25zICh0cmFuc2NyaXB0KSB7XG4gICAgICAgIHZhciB0cmFuc2xhdGlvblN0YXJ0O1xuICAgICAgICB2YXIgdHJhbnNsYXRpb25FbmQ7XG4gICAgICAgIGlmICh0cmFuc2NyaXB0LlRyYW5zbGF0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRyYW5zbGF0aW9uU3RhcnQgPSB0cmFuc2NyaXB0LlRyYW5zbGF0aW9uLnN0YXJ0O1xuICAgICAgICAgICAgdHJhbnNsYXRpb25FbmQgPSB0cmFuc2NyaXB0LlRyYW5zbGF0aW9uLmVuZDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZXhvbnMgPSB0cmFuc2NyaXB0LnJhd0V4b25zO1xuXG4gICAgICAgIHZhciBuZXdFeG9ucyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpPTA7IGk8ZXhvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0cmFuc2NyaXB0LlRyYW5zbGF0aW9uID09PSB1bmRlZmluZWQpIHsgLy8gTk8gY29kaW5nIHRyYW5zY3JpcHRcbiAgICAgICAgICAgICAgICBuZXdFeG9ucy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQgICA6IGV4b25zW2ldLnN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICBlbmQgICAgIDogZXhvbnNbaV0uZW5kLFxuICAgICAgICAgICAgICAgICAgICB0cmFuc2NyaXB0IDogdHJhbnNjcmlwdCxcbiAgICAgICAgICAgICAgICAgICAgY29kaW5nICA6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBvZmZzZXQgIDogZXhvbnNbaV0uc3RhcnQgLSB0cmFuc2NyaXB0LnN0YXJ0XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChleG9uc1tpXS5zdGFydCA8IHRyYW5zbGF0aW9uU3RhcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gNSdcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV4b25zW2ldLmVuZCA8IHRyYW5zbGF0aW9uU3RhcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENvbXBsZXRlbHkgbm9uIGNvZGluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3RXhvbnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgIDogZXhvbnNbaV0uc3RhcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kICAgIDogZXhvbnNbaV0uZW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zY3JpcHQgOiB0cmFuc2NyaXB0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGluZyA6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldCAgOiBleG9uc1tpXS5zdGFydCAtIHRyYW5zY3JpcHQuc3RhcnRcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSGFzIDUnVVRSXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmNFeG9uNSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydCAgOiBleG9uc1tpXS5zdGFydCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmQgICAgOiB0cmFuc2xhdGlvblN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zY3JpcHQgOiB0cmFuc2NyaXB0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGluZyA6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldCAgOiBleG9uc1tpXS5zdGFydCAtIHRyYW5zY3JpcHQuc3RhcnRcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29kaW5nRXhvbjUgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgIDogdHJhbnNsYXRpb25TdGFydCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmQgICAgOiBleG9uc1tpXS5lbmQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNjcmlwdCA6IHRyYW5zY3JpcHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kaW5nIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQgIDogZXhvbnNbaV0uc3RhcnQgLSB0cmFuc2NyaXB0LnN0YXJ0XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV4b25zW2ldLnN0cmFuZCA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0V4b25zLnB1c2gobmNFeG9uNSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3RXhvbnMucHVzaChjb2RpbmdFeG9uNSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0V4b25zLnB1c2goY29kaW5nRXhvbjUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0V4b25zLnB1c2gobmNFeG9uNSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGV4b25zW2ldLmVuZCA+IHRyYW5zbGF0aW9uRW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIDMnXG4gICAgICAgICAgICAgICAgICAgIGlmIChleG9uc1tpXS5zdGFydCA+IHRyYW5zbGF0aW9uRW5kKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDb21wbGV0ZWx5IG5vbiBjb2RpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0V4b25zLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ICAgOiBleG9uc1tpXS5zdGFydCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmQgICAgIDogZXhvbnNbaV0uZW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zY3JpcHQgOiB0cmFuc2NyaXB0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGluZyAgOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQgIDogZXhvbnNbaV0uc3RhcnQgLSB0cmFuc2NyaXB0LnN0YXJ0XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhhcyAzJ1VUUlxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvZGluZ0V4b24zID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ICA6IGV4b25zW2ldLnN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZCAgICA6IHRyYW5zbGF0aW9uRW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zY3JpcHQgOiB0cmFuc2NyaXB0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGluZyA6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0ICA6IGV4b25zW2ldLnN0YXJ0IC0gdHJhbnNjcmlwdC5zdGFydFxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuY0V4b24zID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ICA6IHRyYW5zbGF0aW9uRW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZCAgICA6IGV4b25zW2ldLmVuZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2NyaXB0IDogdHJhbnNjcmlwdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RpbmcgOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQgIDogZXhvbnNbaV0uc3RhcnQgLSB0cmFuc2NyaXB0LnN0YXJ0XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV4b25zW2ldLnN0cmFuZCA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0V4b25zLnB1c2goY29kaW5nRXhvbjMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0V4b25zLnB1c2gobmNFeG9uMyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0V4b25zLnB1c2gobmNFeG9uMyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3RXhvbnMucHVzaChjb2RpbmdFeG9uMyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBjb2RpbmcgZXhvblxuICAgICAgICAgICAgICAgICAgICBuZXdFeG9ucy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ICA6IGV4b25zW2ldLnN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgZW5kICAgIDogZXhvbnNbaV0uZW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNjcmlwdCA6IHRyYW5zY3JpcHQsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RpbmcgOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0ICA6IGV4b25zW2ldLnN0YXJ0IC0gdHJhbnNjcmlwdC5zdGFydFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ld0V4b25zO1xuICAgIH1cblxuICAgIHJldHVybiBib2FyZC50cmFjay5kYXRhKCkudXBkYXRlKHVwZGF0ZXIpO1xufTtcblxuLy8gZXhwb3J0XG52YXIgZ2Vub21lX2RhdGEgPSB7XG4gICAgZ2VuZSA6IGRhdGFfZ2VuZSxcbiAgICBzZXF1ZW5jZSA6IGRhdGFfc2VxdWVuY2UsXG4gICAgdHJhbnNjcmlwdCA6IGRhdGFfdHJhbnNjcmlwdFxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gZ2Vub21lX2RhdGE7XG4iLCJ2YXIgYXBpanMgPSByZXF1aXJlIChcInRudC5hcGlcIik7XG52YXIgbGF5b3V0ID0gcmVxdWlyZShcIi4vbGF5b3V0LmpzXCIpO1xudmFyIGJvYXJkID0gcmVxdWlyZShcInRudC5ib2FyZFwiKTtcblxudmFyIHRudF9mZWF0dXJlX3RyYW5zY3JpcHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGZlYXR1cmUgPSBib2FyZC50cmFjay5mZWF0dXJlKClcbiAgICAgICAgLmxheW91dCAoYm9hcmQudHJhY2subGF5b3V0LmZlYXR1cmUoKSlcbiAgICAgICAgLmluZGV4IChmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgcmV0dXJuIGQua2V5O1xuICAgICAgICB9KTtcblxuICAgIGZlYXR1cmUuY3JlYXRlIChmdW5jdGlvbiAobmV3X2VsZW1zLCB4U2NhbGUpIHtcbiAgICAgICAgdmFyIHRyYWNrID0gdGhpcztcbiAgICAgICAgdmFyIGdzID0gbmV3X2VsZW1zXG4gICAgICAgICAgICAuYXBwZW5kKFwiZ1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJ0cmFuc2xhdGUoXCIgKyB4U2NhbGUoZC5zdGFydCkgKyBcIixcIiArIChmZWF0dXJlLmxheW91dCgpLmdlbmVfc2xvdCgpLnNsb3RfaGVpZ2h0ICogZC5zbG90KSArIFwiKVwiO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgZ3NcbiAgICAgICAgICAgIC5hcHBlbmQoXCJsaW5lXCIpXG4gICAgICAgICAgICAuYXR0cihcIngxXCIsIDApXG4gICAgICAgICAgICAuYXR0cihcInkxXCIsIH5+KGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuZ2VuZV9oZWlnaHQvMikpXG4gICAgICAgICAgICAuYXR0cihcIngyXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICh4U2NhbGUoZC5lbmQpIC0geFNjYWxlKGQuc3RhcnQpKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuYXR0cihcInkyXCIsIH5+KGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuZ2VuZV9oZWlnaHQvMikpXG4gICAgICAgICAgICAuYXR0cihcImZpbGxcIiwgXCJub25lXCIpXG4gICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLCB0cmFjay5iYWNrZ3JvdW5kX2NvbG9yKCkpXG4gICAgICAgICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLCAyKVxuICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgLmR1cmF0aW9uKDUwMClcbiAgICAgICAgICAgIC5hdHRyKFwic3Ryb2tlXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpKGQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAvLy5hdHRyKFwic3Ryb2tlXCIsIGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpKTtcblxuICAgICAgICAvLyBleG9uc1xuICAgICAgICAvLyBwYXNzIHRoZSBcInNsb3RcIiB0byB0aGUgZXhvbnMgYW5kIGludHJvbnNcbiAgICAgICAgbmV3X2VsZW1zLmVhY2ggKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICBpZiAoZC5leG9ucykge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxkLmV4b25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGQuZXhvbnNbaV0uc2xvdCA9IGQuc2xvdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBleG9ucyA9IGdzLnNlbGVjdEFsbChcIi5leG9uc1wiKVxuICAgICAgICAgICAgLmRhdGEoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZC5leG9ucyB8fCBbXTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGQuc3RhcnQ7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBleG9uc1xuICAgICAgICAgICAgLmVudGVyKClcbiAgICAgICAgICAgIC5hcHBlbmQoXCJyZWN0XCIpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X2V4b25zXCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKHhTY2FsZShkLnN0YXJ0ICsgZC5vZmZzZXQpIC0geFNjYWxlKGQuc3RhcnQpKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuYXR0cihcInlcIiwgMClcbiAgICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKHhTY2FsZShkLmVuZCkgLSB4U2NhbGUoZC5zdGFydCkpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuZ2VuZV9oZWlnaHQpXG4gICAgICAgICAgICAuYXR0cihcImZpbGxcIiwgdHJhY2suYmFja2dyb3VuZF9jb2xvcigpKVxuICAgICAgICAgICAgLmF0dHIoXCJzdHJva2VcIiwgdHJhY2suYmFja2dyb3VuZF9jb2xvcigpKVxuICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgLmR1cmF0aW9uKDUwMClcbiAgICAgICAgICAgIC8vLmF0dHIoXCJzdHJva2VcIiwgZmVhdHVyZS5mb3JlZ3JvdW5kX2NvbG9yKCkpXG4gICAgICAgICAgICAuYXR0cihcInN0cm9rZVwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmZWF0dXJlLmZvcmVncm91bmRfY29sb3IoKShkKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuYXR0cihcImZpbGxcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZC5jb2RpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmZWF0dXJlLmZvcmVncm91bmRfY29sb3IoKShkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGQuY29kaW5nID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJhY2suYmFja2dyb3VuZF9jb2xvcigpO1xuICAgICAgICAgICAgICAgICAgICAvLyByZXR1cm4gXCJwaW5rXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBmZWF0dXJlLmZvcmVncm91bmRfY29sb3IoKShkKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8vIGxhYmVsc1xuICAgICAgICBnc1xuICAgICAgICAgICAgLmFwcGVuZChcInRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfbmFtZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIDApXG4gICAgICAgICAgICAuYXR0cihcInlcIiwgMjUpXG4gICAgICAgICAgICAuYXR0cihcImZpbGxcIiwgdHJhY2suYmFja2dyb3VuZF9jb2xvcigpKVxuICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5zaG93X2xhYmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkLmRpc3BsYXlfbGFiZWw7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsIFwibm9ybWFsXCIpXG4gICAgICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgICAgICAuZHVyYXRpb24oNTAwKVxuICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsIGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpKTtcblxuICAgIH0pXG5cbiAgICBmZWF0dXJlLnVwZGF0ZXIgKGZ1bmN0aW9uICh0cmFuc2NyaXB0cywgeFNjYWxlKSB7XG4gICAgICAgIHZhciB0cmFjayA9IHRoaXM7XG4gICAgICAgIHZhciBncyA9IHRyYW5zY3JpcHRzLnNlbGVjdChcImdcIilcbiAgICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAgIC5kdXJhdGlvbigyMDApXG4gICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBcInRyYW5zbGF0ZShcIiArIHhTY2FsZShkLnN0YXJ0KSArIFwiLFwiICsgKGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuc2xvdF9oZWlnaHQgKiBkLnNsb3QpICsgXCIpXCI7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgZ3NcbiAgICAgICAgICAgIC5zZWxlY3RBbGwgKFwicmVjdFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5nZW5lX2hlaWdodCk7XG4gICAgICAgIGdzXG4gICAgICAgICAgICAuc2VsZWN0QWxsKFwibGluZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4MlwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoeFNjYWxlKGQuZW5kKSAtIHhTY2FsZShkLnN0YXJ0KSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmF0dHIoXCJ5MVwiLCB+fihmZWF0dXJlLmxheW91dCgpLmdlbmVfc2xvdCgpLmdlbmVfaGVpZ2h0LzIpKVxuICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCB+fihmZWF0dXJlLmxheW91dCgpLmdlbmVfc2xvdCgpLmdlbmVfaGVpZ2h0LzIpKTtcbiAgICAgICAgZ3NcbiAgICAgICAgICAgIC5zZWxlY3QgKFwidGV4dFwiKVxuICAgICAgICAgICAgLnRleHQgKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuc2hvd19sYWJlbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC5kaXNwbGF5X2xhYmVsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZmVhdHVyZS5tb3ZlciAoZnVuY3Rpb24gKHRyYW5zY3JpcHRzLCB4U2NhbGUpIHtcbiAgICAgICAgdmFyIGdzID0gdHJhbnNjcmlwdHMuc2VsZWN0KFwiZ1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJ0cmFuc2xhdGUoXCIgKyB4U2NhbGUoZC5zdGFydCkgKyBcIixcIiArIChmZWF0dXJlLmxheW91dCgpLmdlbmVfc2xvdCgpLnNsb3RfaGVpZ2h0ICogZC5zbG90KSArIFwiKVwiO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIGdzLnNlbGVjdEFsbChcImxpbmVcIilcbiAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKHhTY2FsZShkLmVuZCkgLSB4U2NhbGUoZC5zdGFydCkpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5hdHRyKFwieTFcIiwgfn4oZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5nZW5lX2hlaWdodC8yKSlcbiAgICAgICAgICAgIC5hdHRyKFwieTJcIiwgfn4oZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5nZW5lX2hlaWdodC8yKSlcbiAgICAgICAgICAgIC8vIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgIC8vICAgICByZXR1cm4gKHhTY2FsZShkLmVuZCkgLSB4U2NhbGUoZC5zdGFydCkpO1xuICAgICAgICAgICAgLy8gfSlcbiAgICAgICAgZ3Muc2VsZWN0QWxsKFwicmVjdFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoeFNjYWxlKGQuZW5kKSAtIHhTY2FsZShkLnN0YXJ0KSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICBncy5zZWxlY3RBbGwoXCIudG50X2V4b25zXCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKHhTY2FsZShkLnN0YXJ0ICsgZC5vZmZzZXQpIC0geFNjYWxlKGQuc3RhcnQpKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbiAgICByZXR1cm4gZmVhdHVyZTtcbn07XG5cblxudmFyIHRudF9mZWF0dXJlX3NlcXVlbmNlID0gZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIGNvbmZpZyA9IHtcbiAgICAgICAgZm9udHNpemUgOiAxMCxcbiAgICAgICAgc2VxdWVuY2UgOiBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgcmV0dXJuIGQuc2VxdWVuY2U7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gJ0luaGVyaXQnIGZyb20gdG50LnRyYWNrLmZlYXR1cmVcbiAgICB2YXIgZmVhdHVyZSA9IGJvYXJkLnRyYWNrLmZlYXR1cmUoKVxuICAgIC5pbmRleCAoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgcmV0dXJuIGQucG9zO1xuICAgIH0pO1xuXG4gICAgdmFyIGFwaSA9IGFwaWpzIChmZWF0dXJlKVxuICAgIC5nZXRzZXQgKGNvbmZpZyk7XG5cblxuICAgIGZlYXR1cmUuY3JlYXRlIChmdW5jdGlvbiAobmV3X250cywgeFNjYWxlKSB7XG4gICAgICAgIHZhciB0cmFjayA9IHRoaXM7XG5cbiAgICAgICAgbmV3X250c1xuICAgICAgICAgICAgLmFwcGVuZChcInRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwiZmlsbFwiLCB0cmFjay5iYWNrZ3JvdW5kX2NvbG9yKCkpXG4gICAgICAgICAgICAuc3R5bGUoJ2ZvbnQtc2l6ZScsIGNvbmZpZy5mb250c2l6ZSArIFwicHhcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4U2NhbGUgKGQucG9zKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuYXR0cihcInlcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gfn4odHJhY2suaGVpZ2h0KCkgLyAyKSArIDU7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1mYW1pbHlcIiwgJ1wiTHVjaWRhIENvbnNvbGVcIiwgTW9uYWNvLCBtb25vc3BhY2UnKVxuICAgICAgICAgICAgLnRleHQoY29uZmlnLnNlcXVlbmNlKVxuICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgLmR1cmF0aW9uKDUwMClcbiAgICAgICAgICAgIC5hdHRyKCdmaWxsJywgZmVhdHVyZS5mb3JlZ3JvdW5kX2NvbG9yKCkpO1xuICAgIH0pO1xuXG4gICAgZmVhdHVyZS5tb3ZlciAoZnVuY3Rpb24gKG50cywgeFNjYWxlKSB7XG4gICAgICAgIG50cy5zZWxlY3QgKFwidGV4dFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHhTY2FsZShkLnBvcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICByZXR1cm4gZmVhdHVyZTtcbn07XG5cbnZhciB0bnRfZmVhdHVyZV9nZW5lID0gZnVuY3Rpb24gKCkge1xuXG4gICAgLy8gJ0luaGVyaXQnIGZyb20gdG50LnRyYWNrLmZlYXR1cmVcbiAgICB2YXIgZmVhdHVyZSA9IGJvYXJkLnRyYWNrLmZlYXR1cmUoKVxuXHQubGF5b3V0KGJvYXJkLnRyYWNrLmxheW91dC5mZWF0dXJlKCkpXG5cdC5pbmRleChmdW5jdGlvbiAoZCkge1xuXHQgICAgcmV0dXJuIGQuaWQ7XG5cdH0pO1xuXG4gICAgZmVhdHVyZS5jcmVhdGUoZnVuY3Rpb24gKG5ld19lbGVtcywgeFNjYWxlKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cdG5ld19lbGVtc1xuXHQgICAgLmFwcGVuZChcInJlY3RcIilcblx0ICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdHJldHVybiB4U2NhbGUoZC5zdGFydCk7XG5cdCAgICB9KVxuXHQgICAgLmF0dHIoXCJ5XCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuc2xvdF9oZWlnaHQgKiBkLnNsb3Q7XG5cdCAgICB9KVxuXHQgICAgLmF0dHIoXCJ3aWR0aFwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdHJldHVybiAoeFNjYWxlKGQuZW5kKSAtIHhTY2FsZShkLnN0YXJ0KSk7XG5cdCAgICB9KVxuXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5nZW5lX2hlaWdodClcblx0ICAgIC5hdHRyKFwiZmlsbFwiLCB0cmFjay5iYWNrZ3JvdW5kX2NvbG9yKCkpXG5cdCAgICAudHJhbnNpdGlvbigpXG5cdCAgICAuZHVyYXRpb24oNTAwKVxuXHQgICAgLmF0dHIoXCJmaWxsXCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0aWYgKGQuY29sb3IgPT09IHVuZGVmaW5lZCkge1xuXHRcdCAgICByZXR1cm4gZmVhdHVyZS5mb3JlZ3JvdW5kX2NvbG9yKCk7XG5cdFx0fSBlbHNlIHtcblx0XHQgICAgcmV0dXJuIGQuY29sb3I7XG5cdFx0fVxuXHQgICAgfSk7XG5cblx0bmV3X2VsZW1zXG5cdCAgICAuYXBwZW5kKFwidGV4dFwiKVxuXHQgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF9uYW1lXCIpXG5cdCAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4geFNjYWxlKGQuc3RhcnQpO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwieVwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdHJldHVybiAoZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5zbG90X2hlaWdodCAqIGQuc2xvdCkgKyAyNTtcblx0ICAgIH0pXG5cdCAgICAuYXR0cihcImZpbGxcIiwgdHJhY2suYmFja2dyb3VuZF9jb2xvcigpKVxuXHQgICAgLnRleHQoZnVuY3Rpb24gKGQpIHtcblx0XHRpZiAoZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5zaG93X2xhYmVsKSB7XG5cdFx0ICAgIHJldHVybiBkLmRpc3BsYXlfbGFiZWw7XG5cdFx0fSBlbHNlIHtcblx0XHQgICAgcmV0dXJuIFwiXCI7XG5cdFx0fVxuXHQgICAgfSlcblx0ICAgIC5zdHlsZShcImZvbnQtd2VpZ2h0XCIsIFwibm9ybWFsXCIpXG5cdCAgICAudHJhbnNpdGlvbigpXG5cdCAgICAuZHVyYXRpb24oNTAwKVxuXHQgICAgLmF0dHIoXCJmaWxsXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIGZlYXR1cmUuZm9yZWdyb3VuZF9jb2xvcigpO1xuXHQgICAgfSk7XG4gICAgfSk7XG5cbiAgICBmZWF0dXJlLnVwZGF0ZXIoZnVuY3Rpb24gKGdlbmVzKSB7XG5cdHZhciB0cmFjayA9IHRoaXM7XG5cdGdlbmVzXG5cdCAgICAuc2VsZWN0KFwicmVjdFwiKVxuXHQgICAgLnRyYW5zaXRpb24oKVxuXHQgICAgLmR1cmF0aW9uKDUwMClcblx0ICAgIC5hdHRyKFwieVwiLCBmdW5jdGlvbiAoZCkge1xuXHRcdHJldHVybiAoZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5zbG90X2hlaWdodCAqIGQuc2xvdCk7XG5cdCAgICB9KVxuXHQgICAgLmF0dHIoXCJoZWlnaHRcIiwgZmVhdHVyZS5sYXlvdXQoKS5nZW5lX3Nsb3QoKS5nZW5lX2hlaWdodCk7XG5cblx0Z2VuZXNcblx0ICAgIC5zZWxlY3QoXCJ0ZXh0XCIpXG5cdCAgICAudHJhbnNpdGlvbigpXG5cdCAgICAuZHVyYXRpb24oNTAwKVxuXHQgICAgLmF0dHIoXCJ5XCIsIGZ1bmN0aW9uIChkKSB7XG5cdFx0cmV0dXJuIChmZWF0dXJlLmxheW91dCgpLmdlbmVfc2xvdCgpLnNsb3RfaGVpZ2h0ICogZC5zbG90KSArIDI1O1xuXHQgICAgfSlcblx0ICAgIC50ZXh0KGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZlYXR1cmUubGF5b3V0KCkuZ2VuZV9zbG90KCkuc2hvd19sYWJlbCkge1xuXHRcdCAgICByZXR1cm4gZC5kaXNwbGF5X2xhYmVsO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG5cdFx0ICAgIHJldHVybiBcIlwiO1xuICAgICAgICAgICAgICAgIH1cblx0ICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZmVhdHVyZS5tb3ZlcihmdW5jdGlvbiAoZ2VuZXMsIHhTY2FsZSkge1xuXHRnZW5lcy5zZWxlY3QoXCJyZWN0XCIpXG5cdCAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4geFNjYWxlKGQuc3RhcnQpO1xuXHQgICAgfSlcblx0ICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24gKGQpIHtcblx0XHRyZXR1cm4gKHhTY2FsZShkLmVuZCkgLSB4U2NhbGUoZC5zdGFydCkpO1xuXHQgICAgfSk7XG5cblx0Z2VuZXMuc2VsZWN0KFwidGV4dFwiKVxuXHQgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICByZXR1cm4geFNjYWxlKGQuc3RhcnQpO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBmZWF0dXJlO1xufTtcblxuLy8gZ2Vub21lIGxvY2F0aW9uXG4gdmFyIHRudF9mZWF0dXJlX2xvY2F0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgICB2YXIgcm93O1xuICAgICB2YXIgY2hyO1xuICAgICB2YXIgc3BlY2llcztcbiAgICAgdmFyIHRleHRfY2JhayA9IGZ1bmN0aW9uIChzcCwgY2hyLCBmcm9tLCB0bykge1xuICAgICAgICAgcmV0dXJuIHNwICsgXCIgXCIgKyBjaHIgKyBcIjpcIiArIGZyb20gKyBcIi1cIiArIHRvO1xuICAgICB9O1xuXG4gICAgIHZhciBmZWF0dXJlID0ge307XG4gICAgIGZlYXR1cmUucmVzZXQgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICAgZmVhdHVyZS5wbG90ID0gZnVuY3Rpb24gKCkge307XG4gICAgIGZlYXR1cmUuaW5pdCA9IGZ1bmN0aW9uICgpIHsgcm93ID0gdW5kZWZpbmVkOyB9O1xuICAgICBmZWF0dXJlLm1vdmUgPSBmdW5jdGlvbiAoeFNjYWxlKSB7XG4gICAgICAgICB2YXIgZG9tYWluID0geFNjYWxlLmRvbWFpbigpO1xuICAgICAgICAgcm93LnNlbGVjdCAoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAudGV4dCh0ZXh0X2NiYWsoc3BlY2llcywgY2hyLCB+fmRvbWFpblswXSwgfn5kb21haW5bMV0pKTtcbiAgICAgfTtcbiAgICAgZmVhdHVyZS51cGRhdGUgPSBmdW5jdGlvbiAoeFNjYWxlLCB3aGVyZSkge1xuICAgICAgICAgY2hyID0gd2hlcmUuY2hyO1xuICAgICAgICAgc3BlY2llcyA9IHdoZXJlLnNwZWNpZXM7XG4gICAgICAgICB2YXIgdHJhY2sgPSB0aGlzO1xuICAgICAgICAgdmFyIHN2Z19nID0gdHJhY2suZztcbiAgICAgICAgIHZhciBkb21haW4gPSB4U2NhbGUuZG9tYWluKCk7XG4gICAgICAgICBpZiAocm93ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICByb3cgPSBzdmdfZztcbiAgICAgICAgICAgICByb3dcbiAgICAgICAgICAgICAgICAgLmFwcGVuZChcInRleHRcIilcbiAgICAgICAgICAgICAgICAgLnRleHQodGV4dF9jYmFrKHNwZWNpZXMsIGNociwgfn5kb21haW5bMF0sIH5+ZG9tYWluWzFdKSk7XG4gICAgICAgICB9XG4gICAgIH07XG4gICAgIGZlYXR1cmUudGV4dCA9IGZ1bmN0aW9uIChjYmFrKSB7XG4gICAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHRleHRfY2JhaztcbiAgICAgICAgfVxuICAgICAgICB0ZXh0X2NiYWsgPSBjYmFrO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgfTtcblxuICAgICByZXR1cm4gZmVhdHVyZTtcbiB9O1xuXG52YXIgZ2Vub21lX2ZlYXR1cmVzID0ge1xuICAgIGdlbmUgOiB0bnRfZmVhdHVyZV9nZW5lLFxuICAgIHNlcXVlbmNlIDogdG50X2ZlYXR1cmVfc2VxdWVuY2UsXG4gICAgdHJhbnNjcmlwdCA6IHRudF9mZWF0dXJlX3RyYW5zY3JpcHQsXG4gICAgbG9jYXRpb24gOiB0bnRfZmVhdHVyZV9sb2NhdGlvbixcbn07XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBnZW5vbWVfZmVhdHVyZXM7XG4iLCJ2YXIgdG50X3Jlc3QgPSByZXF1aXJlKFwidG50LmVuc2VtYmxcIik7XG52YXIgYXBpanMgPSByZXF1aXJlKFwidG50LmFwaVwiKTtcbnZhciB0bnRfYm9hcmQgPSByZXF1aXJlKFwidG50LmJvYXJkXCIpO1xudG50X2JvYXJkLnRyYWNrLmRhdGEuZ2Vub21lID0gcmVxdWlyZShcIi4vZGF0YS5qc1wiKTtcbnRudF9ib2FyZC50cmFjay5mZWF0dXJlLmdlbm9tZSA9IHJlcXVpcmUoXCIuL2ZlYXR1cmVcIik7XG50bnRfYm9hcmQudHJhY2subGF5b3V0LmZlYXR1cmUgPSByZXF1aXJlKFwiLi9sYXlvdXRcIik7XG5cbnRudF9ib2FyZF9nZW5vbWUgPSBmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIC8vIFByaXZhdGUgdmFyc1xuICAgIHZhciBlbnNfcmUgPSAvXkVOU1xcdytcXGQrJC87XG4gICAgdmFyIGNocl9sZW5ndGg7XG5cbiAgICAvLyBWYXJzIGV4cG9zZWQgaW4gdGhlIEFQSVxuICAgIHZhciBjb25mID0ge1xuICAgICAgICBnZW5lICAgICAgICAgICA6IHVuZGVmaW5lZCxcbiAgICAgICAgeHJlZl9zZWFyY2ggICAgOiBmdW5jdGlvbiAoKSB7fSxcbiAgICAgICAgZW5zZ2VuZV9zZWFyY2ggOiBmdW5jdGlvbiAoKSB7fSxcbiAgICAgICAgY29udGV4dCAgICAgICAgOiAwLFxuICAgICAgICByZXN0ICAgICAgICAgICA6IHRudF9yZXN0KClcbiAgICB9O1xuICAgIHRudF9ib2FyZC50cmFjay5kYXRhLmdlbm9tZS5yZXN0ID0gY29uZi5yZXN0O1xuXG4gICAgdmFyIGdlbmU7XG4gICAgdmFyIGxpbWl0cyA9IHtcbiAgICAgICAgbGVmdCA6IDAsXG4gICAgICAgIHJpZ2h0IDogdW5kZWZpbmVkLFxuICAgICAgICB6b29tX291dCA6IGNvbmYucmVzdC5saW1pdHMucmVnaW9uLFxuICAgICAgICB6b29tX2luICA6IDIwMFxuICAgIH07XG5cbiAgICAvLyBXZSBcImluaGVyaXRcIiBmcm9tIGJvYXJkXG4gICAgdmFyIGdlbm9tZV9icm93c2VyID0gdG50X2JvYXJkKCk7XG5cbiAgICAvLyBUaGUgbG9jYXRpb24gYW5kIGF4aXMgdHJhY2tcbiAgICB2YXIgbG9jYXRpb25fdHJhY2sgPSB0bnRfYm9hcmQudHJhY2soKVxuICAgICAgICAuaGVpZ2h0KDIwKVxuICAgICAgICAuYmFja2dyb3VuZF9jb2xvcihcIndoaXRlXCIpXG4gICAgICAgIC5kYXRhKHRudF9ib2FyZC50cmFjay5kYXRhLmVtcHR5KCkpXG4gICAgICAgIC5kaXNwbGF5KHRudF9ib2FyZC50cmFjay5mZWF0dXJlLmdlbm9tZS5sb2NhdGlvbigpKTtcblxuICAgIHZhciBheGlzX3RyYWNrID0gdG50X2JvYXJkLnRyYWNrKClcbiAgICAgICAgLmhlaWdodCgwKVxuICAgICAgICAuYmFja2dyb3VuZF9jb2xvcihcIndoaXRlXCIpXG4gICAgICAgIC5kYXRhKHRudF9ib2FyZC50cmFjay5kYXRhLmVtcHR5KCkpXG4gICAgICAgIC5kaXNwbGF5KHRudF9ib2FyZC50cmFjay5mZWF0dXJlLmF4aXMoKSk7XG5cbiAgICBnZW5vbWVfYnJvd3NlclxuXHQgICAuYWRkX3RyYWNrKGxvY2F0aW9uX3RyYWNrKVxuICAgICAgIC5hZGRfdHJhY2soYXhpc190cmFjayk7XG5cbiAgICAvLyBEZWZhdWx0IGxvY2F0aW9uOlxuICAgIGdlbm9tZV9icm93c2VyXG5cdCAgIC5zcGVjaWVzKFwiaHVtYW5cIilcbiAgICAgICAuY2hyKDcpXG4gICAgICAgLmZyb20oMTM5NDI0OTQwKVxuICAgICAgIC50bygxNDE3ODQxMDApO1xuXG4gICAgLy8gV2Ugc2F2ZSB0aGUgc3RhcnQgbWV0aG9kIG9mIHRoZSAncGFyZW50JyBvYmplY3RcbiAgICBnZW5vbWVfYnJvd3Nlci5fc3RhcnQgPSBnZW5vbWVfYnJvd3Nlci5zdGFydDtcblxuICAgIC8vIFdlIGhpamFjayBwYXJlbnQncyBzdGFydCBtZXRob2RcbiAgICB2YXIgc3RhcnQgPSBmdW5jdGlvbiAod2hlcmUpIHtcbiAgICAgICAgaWYgKHdoZXJlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGlmICh3aGVyZS5nZW5lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBnZXRfZ2VuZSh3aGVyZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAod2hlcmUuc3BlY2llcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHdoZXJlLnNwZWNpZXMgPSBnZW5vbWVfYnJvd3Nlci5zcGVjaWVzKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZ2Vub21lX2Jyb3dzZXIuc3BlY2llcyh3aGVyZS5zcGVjaWVzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHdoZXJlLmNociA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHdoZXJlLmNociA9IGdlbm9tZV9icm93c2VyLmNocigpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGdlbm9tZV9icm93c2VyLmNocih3aGVyZS5jaHIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAod2hlcmUuZnJvbSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHdoZXJlLmZyb20gPSBnZW5vbWVfYnJvd3Nlci5mcm9tKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZ2Vub21lX2Jyb3dzZXIuZnJvbSh3aGVyZS5mcm9tKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHdoZXJlLnRvID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgd2hlcmUudG8gPSBnZW5vbWVfYnJvd3Nlci50bygpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGdlbm9tZV9icm93c2VyLnRvKHdoZXJlLnRvKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7IC8vIFwid2hlcmVcIiBpcyB1bmRlZiBzbyBsb29rIGZvciBnZW5lIG9yIGxvY1xuICAgICAgICBpZiAoZ2Vub21lX2Jyb3dzZXIuZ2VuZSgpICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGdldF9nZW5lKHsgc3BlY2llcyA6IGdlbm9tZV9icm93c2VyLnNwZWNpZXMoKSxcbiAgICAgICAgICAgICAgICBnZW5lICAgIDogZ2Vub21lX2Jyb3dzZXIuZ2VuZSgpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdoZXJlID0ge307XG4gICAgICAgICAgICB3aGVyZS5zcGVjaWVzID0gZ2Vub21lX2Jyb3dzZXIuc3BlY2llcygpO1xuICAgICAgICAgICAgd2hlcmUuY2hyICAgICA9IGdlbm9tZV9icm93c2VyLmNocigpO1xuICAgICAgICAgICAgd2hlcmUuZnJvbSAgICA9IGdlbm9tZV9icm93c2VyLmZyb20oKTtcbiAgICAgICAgICAgIHdoZXJlLnRvICAgICAgPSBnZW5vbWVfYnJvd3Nlci50bygpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2Vub21lX2Jyb3dzZXIucmlnaHQgKGZ1bmN0aW9uIChkb25lKSB7XG4gICAgICAgIC8vIEdldCB0aGUgY2hyb21vc29tZSBsZW5ndGggYW5kIHVzZSBpdCBhcyB0aGUgJ3JpZ2h0JyBsaW1pdFxuICAgICAgICBnZW5vbWVfYnJvd3Nlci56b29tX2luIChsaW1pdHMuem9vbV9pbik7XG4gICAgICAgIGdlbm9tZV9icm93c2VyLnpvb21fb3V0IChsaW1pdHMuem9vbV9vdXQpO1xuXG4gICAgICAgIHZhciB1cmwgPSBjb25mLnJlc3QudXJsLmNocl9pbmZvICh7XG4gICAgICAgICAgICBzcGVjaWVzIDogd2hlcmUuc3BlY2llcyxcbiAgICAgICAgICAgIGNociAgICAgOiB3aGVyZS5jaHJcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uZi5yZXN0LmNhbGwgKHVybClcbiAgICAgICAgICAgIC50aGVuKCBmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgIGRvbmUocmVzcC5ib2R5Lmxlbmd0aCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIGdlbm9tZV9icm93c2VyLl9zdGFydCgpO1xuICAgIH07XG5cbiAgICB2YXIgaG9tb2xvZ3VlcyA9IGZ1bmN0aW9uIChlbnNHZW5lLCBjYWxsYmFjaykgIHtcbiAgICAgICAgdmFyIHVybCA9IGNvbmYucmVzdC51cmwuaG9tb2xvZ3VlcyAoe2lkIDogZW5zR2VuZX0pO1xuICAgICAgICBjb25mLnJlc3QuY2FsbCh1cmwpXG4gICAgICAgICAgICAudGhlbiAoZnVuY3Rpb24ocmVzcCkge1xuICAgICAgICAgICAgICAgIHZhciBob21vbG9ndWVzID0gcmVzcC5ib2R5LmRhdGFbMF0uaG9tb2xvZ2llcztcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaG9tb2xvZ3Vlc19vYmogPSBzcGxpdF9ob21vbG9ndWVzKGhvbW9sb2d1ZXMpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhob21vbG9ndWVzX29iaik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdmFyIGlzRW5zZW1ibEdlbmUgPSBmdW5jdGlvbih0ZXJtKSB7XG4gICAgICAgIGlmICh0ZXJtLm1hdGNoKGVuc19yZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBnZXRfZ2VuZSA9IGZ1bmN0aW9uICh3aGVyZSkge1xuICAgICAgICBpZiAoaXNFbnNlbWJsR2VuZSh3aGVyZS5nZW5lKSkge1xuICAgICAgICAgICAgZ2V0X2Vuc0dlbmUod2hlcmUuZ2VuZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgdXJsID0gY29uZi5yZXN0LnVybC54cmVmICh7XG4gICAgICAgICAgICAgICAgc3BlY2llcyA6IHdoZXJlLnNwZWNpZXMsXG4gICAgICAgICAgICAgICAgbmFtZSAgICA6IHdoZXJlLmdlbmVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uZi5yZXN0LmNhbGwodXJsKVxuICAgICAgICAgICAgICAgIC50aGVuIChmdW5jdGlvbihyZXNwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkYXRhID0gcmVzcC5ib2R5O1xuICAgICAgICAgICAgICAgICAgICBkYXRhID0gZGF0YS5maWx0ZXIoZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICFkLmlkLmluZGV4T2YoXCJFTlNcIik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YVswXSAhPT0gdW5kZWZpbmVkKSB7XG4vLyAgICAgICAgICAgICAgICAgICAgICAgIGNvbmYueHJlZl9zZWFyY2gocmVzcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBnZXRfZW5zR2VuZShkYXRhWzBdLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb25mLnhyZWZfc2VhcmNoKHJlc3AsIHdoZXJlLmdlbmUsIHdoZXJlLnNwZWNpZXMpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIGdlbm9tZV9icm93c2VyLnN0YXJ0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBnZXRfZW5zR2VuZSA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICB2YXIgdXJsID0gY29uZi5yZXN0LnVybC5nZW5lICh7aWQgOiBpZH0pXG4gICAgICAgIGNvbmYucmVzdC5jYWxsKHVybClcbiAgICAgICAgICAgIC50aGVuIChmdW5jdGlvbihyZXNwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRhdGEgPSByZXNwLmJvZHk7XG4gICAgICAgICAgICAgICAgY29uZi5lbnNnZW5lX3NlYXJjaChkYXRhKTtcbiAgICAgICAgICAgICAgICB2YXIgZXh0cmEgPSB+figoZGF0YS5lbmQgLSBkYXRhLnN0YXJ0KSAqIChjb25mLmNvbnRleHQvMTAwKSk7XG4gICAgICAgICAgICAgICAgZ2Vub21lX2Jyb3dzZXJcbiAgICAgICAgICAgICAgICAgICAgLnNwZWNpZXMoZGF0YS5zcGVjaWVzKVxuICAgICAgICAgICAgICAgICAgICAuY2hyKGRhdGEuc2VxX3JlZ2lvbl9uYW1lKVxuICAgICAgICAgICAgICAgICAgICAuZnJvbShkYXRhLnN0YXJ0IC0gZXh0cmEpXG4gICAgICAgICAgICAgICAgICAgIC50byhkYXRhLmVuZCArIGV4dHJhKTtcblxuICAgICAgICAgICAgICAgIGdlbm9tZV9icm93c2VyLnN0YXJ0KCB7IHNwZWNpZXMgOiBkYXRhLnNwZWNpZXMsXG4gICAgICAgICAgICAgICAgICAgIGNociAgICAgOiBkYXRhLnNlcV9yZWdpb25fbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgZnJvbSAgICA6IGRhdGEuc3RhcnQgLSBleHRyYSxcbiAgICAgICAgICAgICAgICAgICAgdG8gICAgICA6IGRhdGEuZW5kICsgZXh0cmFcbiAgICAgICAgICAgICAgICB9ICk7XG4gICAgICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdmFyIHNwbGl0X2hvbW9sb2d1ZXMgPSBmdW5jdGlvbiAoaG9tb2xvZ3Vlcykge1xuICAgICAgICB2YXIgb3J0aG9QYXR0ID0gL29ydGhvbG9nLztcbiAgICAgICAgdmFyIHBhcmFQYXR0ID0gL3BhcmFsb2cvO1xuXG4gICAgICAgIHZhciBvcnRob2xvZ3VlcyA9IGhvbW9sb2d1ZXMuZmlsdGVyKGZ1bmN0aW9uKGQpe3JldHVybiBkLnR5cGUubWF0Y2gob3J0aG9QYXR0KX0pO1xuICAgICAgICB2YXIgcGFyYWxvZ3VlcyAgPSBob21vbG9ndWVzLmZpbHRlcihmdW5jdGlvbihkKXtyZXR1cm4gZC50eXBlLm1hdGNoKHBhcmFQYXR0KX0pO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAnb3J0aG9sb2d1ZXMnIDogb3J0aG9sb2d1ZXMsXG4gICAgICAgICAgICAncGFyYWxvZ3VlcycgIDogcGFyYWxvZ3Vlc1xuICAgICAgICB9O1xuICAgIH07XG5cbiAgICB2YXIgYXBpID0gYXBpanMoZ2Vub21lX2Jyb3dzZXIpXG4gICAgICAgIC5nZXRzZXQgKGNvbmYpXG4gICAgICAgIC5tZXRob2QoXCJ6b29tX2luXCIsIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGltaXRzLnpvb21faW47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsaW1pdHMuem9vbV9pbiA9IHY7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSk7XG5cbiAgICBhcGkubWV0aG9kICh7XG4gICAgICAgIHN0YXJ0ICAgICAgOiBzdGFydCxcbiAgICAgICAgaG9tb2xvZ3VlcyA6IGhvbW9sb2d1ZXNcbiAgICB9KTtcblxuICAgIHJldHVybiBnZW5vbWVfYnJvd3Nlcjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHRudF9ib2FyZF9nZW5vbWU7XG4iLCJ2YXIgYm9hcmQgPSByZXF1aXJlKFwidG50LmJvYXJkXCIpO1xuYm9hcmQuZ2Vub21lID0gcmVxdWlyZShcIi4vZ2Vub21lXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBib2FyZDtcbiIsInZhciBhcGlqcyA9IHJlcXVpcmUgKFwidG50LmFwaVwiKTtcblxuLy8gVGhlIG92ZXJsYXAgZGV0ZWN0b3IgdXNlZCBmb3IgZ2VuZXNcbnZhciBnZW5lX2xheW91dCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIFByaXZhdGUgdmFyc1xuICAgIHZhciBtYXhfc2xvdHM7XG5cbiAgICAvLyB2YXJzIGV4cG9zZWQgaW4gdGhlIEFQSTpcbiAgICB2YXIgaGVpZ2h0ID0gMTUwO1xuICAgIC8vIHZhciBjb25mID0ge1xuICAgIC8vICAgICBoZWlnaHQgICA6IDE1MCxcbiAgICAvLyAgICAgc2NhbGUgICAgOiB1bmRlZmluZWRcbiAgICAvLyB9O1xuXG4gICAgdmFyIG9sZF9lbGVtZW50cyA9IFtdO1xuXG4gICAgdmFyIHNjYWxlO1xuXG4gICAgdmFyIHNsb3RfdHlwZXMgPSB7XG4gICAgICAgICdleHBhbmRlZCcgICA6IHtcbiAgICAgICAgICAgIHNsb3RfaGVpZ2h0IDogMzAsXG4gICAgICAgICAgICBnZW5lX2hlaWdodCA6IDEwLFxuICAgICAgICAgICAgc2hvd19sYWJlbCAgOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgICdjb2xsYXBzZWQnIDoge1xuICAgICAgICAgICAgc2xvdF9oZWlnaHQgOiAxMCxcbiAgICAgICAgICAgIGdlbmVfaGVpZ2h0IDogNyxcbiAgICAgICAgICAgIHNob3dfbGFiZWwgIDogZmFsc2VcbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIGN1cnJlbnRfc2xvdF90eXBlID0gJ2V4cGFuZGVkJztcblxuICAgIC8vIFRoZSByZXR1cm5lZCBjbG9zdXJlIC8gb2JqZWN0XG4gICAgdmFyIGdlbmVzX2xheW91dCA9IGZ1bmN0aW9uIChuZXdfZ2VuZXMsIHhTY2FsZSkge1xuICAgICAgICB2YXIgdHJhY2sgPSB0aGlzO1xuICAgICAgICBzY2FsZSA9IHhTY2FsZTtcblxuICAgICAgICAvLyBXZSBtYWtlIHN1cmUgdGhhdCB0aGUgZ2VuZXMgaGF2ZSBuYW1lXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmV3X2dlbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAobmV3X2dlbmVzW2ldLmV4dGVybmFsX25hbWUgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBuZXdfZ2VuZXNbaV0uZXh0ZXJuYWxfbmFtZSA9IFwiXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBtYXhfc2xvdHMgPSB+fih0cmFjay5oZWlnaHQoKSAvIHNsb3RfdHlwZXMuZXhwYW5kZWQuc2xvdF9oZWlnaHQpO1xuXG4gICAgICAgIC8vIGlmIChzY2FsZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vICAgICBnZW5lc19sYXlvdXQuc2NhbGUoc2NhbGUpO1xuICAgICAgICAvLyB9XG5cbiAgICAgICAgc2xvdF9rZWVwZXIobmV3X2dlbmVzLCBvbGRfZWxlbWVudHMpO1xuICAgICAgICB2YXIgbmVlZGVkX3Nsb3RzID0gY29sbGl0aW9uX2RldGVjdG9yKG5ld19nZW5lcyk7XG4gICAgICAgIHNsb3RfdHlwZXMuY29sbGFwc2VkLm5lZWRlZF9zbG90cyA9IG5lZWRlZF9zbG90cztcbiAgICAgICAgc2xvdF90eXBlcy5leHBhbmRlZC5uZWVkZWRfc2xvdHMgPSBuZWVkZWRfc2xvdHM7XG4gICAgICAgIGlmIChnZW5lc19sYXlvdXQuZml4ZWRfc2xvdF90eXBlKCkpIHtcbiAgICAgICAgICAgIGN1cnJlbnRfc2xvdF90eXBlID0gZ2VuZXNfbGF5b3V0LmZpeGVkX3Nsb3RfdHlwZSgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKG5lZWRlZF9zbG90cyA+IG1heF9zbG90cykge1xuICAgICAgICAgICAgY3VycmVudF9zbG90X3R5cGUgPSAnY29sbGFwc2VkJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGN1cnJlbnRfc2xvdF90eXBlID0gJ2V4cGFuZGVkJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHJ1biB0aGUgdXNlci1kZWZpbmVkIGNhbGxiYWNrXG4gICAgICAgIGdlbmVzX2xheW91dC5vbl9sYXlvdXRfcnVuKCkoc2xvdF90eXBlcywgY3VycmVudF9zbG90X3R5cGUpO1xuXG4gICAgICAgIC8vY29uZl9yby5lbGVtZW50cyA9IG5ld19nZW5lcztcbiAgICAgICAgb2xkX2VsZW1lbnRzID0gbmV3X2dlbmVzO1xuICAgICAgICByZXR1cm4gbmV3X2dlbmVzO1xuICAgIH07XG5cbiAgICB2YXIgZ2VuZV9zbG90ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gc2xvdF90eXBlc1tjdXJyZW50X3Nsb3RfdHlwZV07XG4gICAgfTtcblxuICAgIHZhciBjb2xsaXRpb25fZGV0ZWN0b3IgPSBmdW5jdGlvbiAoZ2VuZXMpIHtcbiAgICAgICAgdmFyIGdlbmVzX3BsYWNlZCA9IFtdO1xuICAgICAgICB2YXIgZ2VuZXNfdG9fcGxhY2UgPSBnZW5lcztcbiAgICAgICAgdmFyIG5lZWRlZF9zbG90cyA9IDA7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZ2VuZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChnZW5lc1tpXS5zbG90ID4gbmVlZGVkX3Nsb3RzICYmIGdlbmVzW2ldLnNsb3QgPCBtYXhfc2xvdHMpIHtcbiAgICAgICAgICAgICAgICBuZWVkZWRfc2xvdHMgPSBnZW5lc1tpXS5zbG90O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZm9yICh2YXIgaT0wOyBpPGdlbmVzX3RvX3BsYWNlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgZ2VuZXNfYnlfc2xvdCA9IHNvcnRfZ2VuZXNfYnlfc2xvdChnZW5lc19wbGFjZWQpO1xuICAgICAgICAgICAgdmFyIHRoaXNfZ2VuZSA9IGdlbmVzX3RvX3BsYWNlW2ldO1xuICAgICAgICAgICAgaWYgKHRoaXNfZ2VuZS5zbG90ICE9PSB1bmRlZmluZWQgJiYgdGhpc19nZW5lLnNsb3QgPCBtYXhfc2xvdHMpIHtcbiAgICAgICAgICAgICAgICBpZiAoc2xvdF9oYXNfc3BhY2UodGhpc19nZW5lLCBnZW5lc19ieV9zbG90W3RoaXNfZ2VuZS5zbG90XSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXNfcGxhY2VkLnB1c2godGhpc19nZW5lKTtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHNsb3QgPSAwO1xuICAgICAgICAgICAgT1VURVI6IHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNsb3RfaGFzX3NwYWNlKHRoaXNfZ2VuZSwgZ2VuZXNfYnlfc2xvdFtzbG90XSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc19nZW5lLnNsb3QgPSBzbG90O1xuICAgICAgICAgICAgICAgICAgICBnZW5lc19wbGFjZWQucHVzaCh0aGlzX2dlbmUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2xvdCA+IG5lZWRlZF9zbG90cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmVlZGVkX3Nsb3RzID0gc2xvdDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2xvdCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZWVkZWRfc2xvdHMgKyAxO1xuICAgIH07XG5cbiAgICB2YXIgc2xvdF9oYXNfc3BhY2UgPSBmdW5jdGlvbiAocXVlcnlfZ2VuZSwgZ2VuZXNfaW5fdGhpc19zbG90KSB7XG4gICAgICAgIGlmIChnZW5lc19pbl90aGlzX3Nsb3QgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBnZW5lc19pbl90aGlzX3Nsb3QubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIHZhciBzdWJqX2dlbmUgPSBnZW5lc19pbl90aGlzX3Nsb3Rbal07XG4gICAgICAgICAgICBpZiAocXVlcnlfZ2VuZS5pZCA9PT0gc3Vial9nZW5lLmlkKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgeV9sYWJlbF9lbmQgPSBzdWJqX2dlbmUuZGlzcGxheV9sYWJlbC5sZW5ndGggKiA4ICsgc2NhbGUoc3Vial9nZW5lLnN0YXJ0KTsgLy8gVE9ETzogSXQgbWF5IGJlIGJldHRlciB0byBoYXZlIGEgZml4ZWQgZm9udCBzaXplIChpbnN0ZWFkIG9mIHRoZSBoYXJkY29kZWQgdmFsdWUpP1xuICAgICAgICAgICAgdmFyIHkxICA9IHNjYWxlKHN1YmpfZ2VuZS5zdGFydCk7XG4gICAgICAgICAgICB2YXIgeTIgID0gc2NhbGUoc3Vial9nZW5lLmVuZCkgPiB5X2xhYmVsX2VuZCA/IHNjYWxlKHN1YmpfZ2VuZS5lbmQpIDogeV9sYWJlbF9lbmQ7XG4gICAgICAgICAgICB2YXIgeF9sYWJlbF9lbmQgPSBxdWVyeV9nZW5lLmRpc3BsYXlfbGFiZWwubGVuZ3RoICogOCArIHNjYWxlKHF1ZXJ5X2dlbmUuc3RhcnQpO1xuICAgICAgICAgICAgdmFyIHgxID0gc2NhbGUocXVlcnlfZ2VuZS5zdGFydCk7XG4gICAgICAgICAgICB2YXIgeDIgPSBzY2FsZShxdWVyeV9nZW5lLmVuZCkgPiB4X2xhYmVsX2VuZCA/IHNjYWxlKHF1ZXJ5X2dlbmUuZW5kKSA6IHhfbGFiZWxfZW5kO1xuICAgICAgICAgICAgaWYgKCAoKHgxIDw9IHkxKSAmJiAoeDIgPj0geTEpKSB8fFxuICAgICAgICAgICAgKCh4MSA+PSB5MSkgJiYgKHgxIDw9IHkyKSkgKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG5cbiAgICB2YXIgc2xvdF9rZWVwZXIgPSBmdW5jdGlvbiAoZ2VuZXMsIHByZXZfZ2VuZXMpIHtcbiAgICAgICAgdmFyIHByZXZfZ2VuZXNfc2xvdHMgPSBnZW5lczJzbG90cyhwcmV2X2dlbmVzKTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGdlbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAocHJldl9nZW5lc19zbG90c1tnZW5lc1tpXS5pZF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGdlbmVzW2ldLnNsb3QgPSBwcmV2X2dlbmVzX3Nsb3RzW2dlbmVzW2ldLmlkXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgZ2VuZXMyc2xvdHMgPSBmdW5jdGlvbiAoZ2VuZXNfYXJyYXkpIHtcbiAgICAgICAgdmFyIGhhc2ggPSB7fTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBnZW5lc19hcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGdlbmUgPSBnZW5lc19hcnJheVtpXTtcbiAgICAgICAgICAgIGhhc2hbZ2VuZS5pZF0gPSBnZW5lLnNsb3Q7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGhhc2g7XG4gICAgfTtcblxuICAgIHZhciBzb3J0X2dlbmVzX2J5X3Nsb3QgPSBmdW5jdGlvbiAoZ2VuZXMpIHtcbiAgICAgICAgdmFyIHNsb3RzID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZ2VuZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChzbG90c1tnZW5lc1tpXS5zbG90XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgc2xvdHNbZ2VuZXNbaV0uc2xvdF0gPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNsb3RzW2dlbmVzW2ldLnNsb3RdLnB1c2goZ2VuZXNbaV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzbG90cztcbiAgICB9O1xuXG4gICAgLy8gQVBJXG4gICAgdmFyIGFwaSA9IGFwaWpzIChnZW5lc19sYXlvdXQpXG4vLyAgICAuZ2V0c2V0IChjb25mKVxuLy8gICAgLmdldCAoY29uZl9ybylcbiAgICAgICAgLmdldHNldCAoXCJlbGVtZW50c1wiLCBmdW5jdGlvbiAoKSB7fSlcbiAgICAgICAgLmdldHNldCAoXCJvbl9sYXlvdXRfcnVuXCIsIGZ1bmN0aW9uICgpIHt9KVxuICAgICAgICAuZ2V0c2V0IChcImZpeGVkX3Nsb3RfdHlwZVwiKVxuICAgICAgICAubWV0aG9kICh7XG4gICAgICAgICAgICBnZW5lX3Nsb3QgOiBnZW5lX3Nsb3QsXG4gICAgICAgICAgICAvLyBoZWlnaHQgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyAgICAgcmV0dXJuIHNsb3RfdHlwZXMuZXhwYW5kZWQubmVlZGVkX3Nsb3RzICogc2xvdF90eXBlcy5leHBhbmRlZC5zbG90X2hlaWdodDtcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgfSk7XG5cbiAgICAvLyBDaGVjayB0aGF0IHRoZSBmaXhlZCBzbG90IHR5cGUgaXMgdmFsaWRcbiAgICBnZW5lc19sYXlvdXQuZml4ZWRfc2xvdF90eXBlLmNoZWNrKGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHJldHVybiAoKHZhbCA9PT0gXCJjb2xsYXBzZWRcIikgfHwgKHZhbCA9PT0gXCJleHBhbmRlZFwiKSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZ2VuZXNfbGF5b3V0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gZ2VuZV9sYXlvdXQ7XG4iXX0=
