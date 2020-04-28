/**
 * sving v0.0.0  http://omijs.org
 * Front End Cross-Frameworks Framework.
 * By dntzhang https://github.com/dntzhang
 * Github: https://github.com/dntzhang/sving
 * MIT Licensed.
 */

(function () {
  'use strict';

  function Matrix2D(a, b, c, d, tx, ty) {
    this.setValues(a, b, c, d, tx, ty);
  }

  Matrix2D.DEG_TO_RAD = Math.PI / 180;

  Matrix2D.identity = null; // set at bottom of class definition.
  Matrix2D.prototype = {
    setValues: function setValues(a, b, c, d, tx, ty) {
      // don't forget to update docs in the constructor if these change:
      this.a = a == null ? 1 : a;
      this.b = b || 0;
      this.c = c || 0;
      this.d = d == null ? 1 : d;
      this.tx = tx || 0;
      this.ty = ty || 0;
      return this;
    },

    append: function append(a, b, c, d, tx, ty) {
      var a1 = this.a;
      var b1 = this.b;
      var c1 = this.c;
      var d1 = this.d;
      if (a != 1 || b != 0 || c != 0 || d != 1) {
        this.a = a1 * a + c1 * b;
        this.b = b1 * a + d1 * b;
        this.c = a1 * c + c1 * d;
        this.d = b1 * c + d1 * d;
      }
      this.tx = a1 * tx + c1 * ty + this.tx;
      this.ty = b1 * tx + d1 * ty + this.ty;
      return this;
    },

    appendTransform: function appendTransform(x, y, scaleX, scaleY, rotation, skewX, skewY, regX, regY) {
      if (rotation % 360) {
        var r = rotation * Matrix2D.DEG_TO_RAD;
        var cos = Math.cos(r);
        var sin = Math.sin(r);
      } else {
        cos = 1;
        sin = 0;
      }

      if (skewX || skewY) {
        // TODO: can this be combined into a single append operation?
        skewX *= Matrix2D.DEG_TO_RAD;
        skewY *= Matrix2D.DEG_TO_RAD;
        this.append(Math.cos(skewY), Math.sin(skewY), -Math.sin(skewX), Math.cos(skewX), x, y);
        this.append(cos * scaleX, sin * scaleX, -sin * scaleY, cos * scaleY, 0, 0);
      } else {
        this.append(cos * scaleX, sin * scaleX, -sin * scaleY, cos * scaleY, x, y);
      }

      if (regX || regY) {
        this.tx -= regX * this.a + regY * this.c;
        this.ty -= regX * this.b + regY * this.d;
      }
      return this;
    },

    identity: function identity() {
      this.a = this.d = 1;
      this.b = this.c = this.tx = this.ty = 0;
      return this;
    },

    copy: function copy(matrix) {
      return this.setValues(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty);
    },

    clone: function clone() {
      return new Matrix2D(this.a, this.b, this.c, this.d, this.tx, this.ty);
    },

    toString: function toString() {
      return "[Matrix2D (a=" + this.a + " b=" + this.b + " c=" + this.c + " d=" + this.d + " tx=" + this.tx + " ty=" + this.ty + ")]";
    }
  };

  Matrix2D.identity = new Matrix2D();

  /*
  * obaa 2.1.0
  * By dntzhang
  * Github: https://github.com/Tencent/omi/tree/master/packages/obaa
  * MIT Licensed.
  */

  // __r_: root
  // __c_: prop change callback
  // __p_: path

  function obaa(target, arr, callback) {

    var eventPropArr = [];
    if (isArray(target)) {
      if (target.length === 0) {
        target.__o_ = {
          __r_: target,
          __p_: '#'
        };
      }
      mock(target, target);
    }
    if (target && typeof target === 'object' && Object.keys(target).length === 0) {
      track(target);
      target.__o_.__r_ = target;
    }
    for (var prop in target) {
      if (target.hasOwnProperty(prop)) {
        if (callback) {
          if (isArray(arr) && isInArray(arr, prop)) {
            eventPropArr.push(prop);
            watch(target, prop, null, target);
          } else if (isString(arr) && prop == arr) {
            eventPropArr.push(prop);
            watch(target, prop, null, target);
          }
        } else {
          eventPropArr.push(prop);
          watch(target, prop, null, target);
        }
      }
    }
    if (!target.__c_) {
      target.__c_ = [];
    }
    var propChanged = callback ? callback : arr;
    target.__c_.push({
      all: !callback,
      propChanged: propChanged,
      eventPropArr: eventPropArr
    });
  }

  var triggerStr = ['concat', 'copyWithin', 'fill', 'pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift', 'size'].join(',');

  var methods = ['concat', 'copyWithin', 'entries', 'every', 'fill', 'filter', 'find', 'findIndex', 'forEach', 'includes', 'indexOf', 'join', 'keys', 'lastIndexOf', 'map', 'pop', 'push', 'reduce', 'reduceRight', 'reverse', 'shift', 'slice', 'some', 'sort', 'splice', 'toLocaleString', 'toString', 'unshift', 'values', 'size'];

  function mock(target, root) {
    methods.forEach(function (item) {
      target[item] = function () {
        var old = Array.prototype.slice.call(this, 0);
        var result = Array.prototype[item].apply(this, Array.prototype.slice.call(arguments));
        if (new RegExp('\\b' + item + '\\b').test(triggerStr)) {
          for (var cprop in this) {
            if (this.hasOwnProperty(cprop) && !isFunction(this[cprop])) {
              watch(this, cprop, this.__o_.__p_, root);
            }
          }
          //todo
          onPropertyChanged('Array-' + item, this, old, this, this.__o_.__p_, root);
        }
        return result;
      };
      target['pure' + item.substring(0, 1).toUpperCase() + item.substring(1)] = function () {
        return Array.prototype[item].apply(this, Array.prototype.slice.call(arguments));
      };
    });
  }

  function watch(target, prop, path, root) {
    if (prop === '__o_') return;
    if (isFunction(target[prop])) return;
    if (!target.__o_) target.__o_ = {
      __r_: root
    };
    if (path !== undefined && path !== null) {
      target.__o_.__p_ = path;
    } else {
      target.__o_.__p_ = '#';
    }

    var currentValue = target.__o_[prop] = target[prop];
    Object.defineProperty(target, prop, {
      get: function get() {
        return this.__o_[prop];
      },
      set: function set(value) {
        var old = this.__o_[prop];
        this.__o_[prop] = value;
        onPropertyChanged(prop, value, old, this, target.__o_.__p_, root);
      },
      configurable: true,
      enumerable: true
    });
    if (typeof currentValue == 'object') {
      if (isArray(currentValue)) {
        mock(currentValue, root);
        if (currentValue.length === 0) {
          track(currentValue, prop, path);
        }
      }
      if (currentValue && Object.keys(currentValue).length === 0) {
        track(currentValue, prop, path);
      }
      for (var cprop in currentValue) {
        if (currentValue.hasOwnProperty(cprop)) {
          watch(currentValue, cprop, target.__o_.__p_ + '-' + prop, root);
        }
      }
    }
  }

  function track(obj, prop, path) {
    if (obj.__o_) {
      return;
    }
    obj.__o_ = {};
    if (path !== undefined && path !== null) {
      obj.__o_.__p_ = path + '-' + prop;
    } else {
      if (prop !== undefined && prop !== null) {
        obj.__o_.__p_ = '#' + '-' + prop;
      } else {
        obj.__o_.__p_ = '#';
      }
    }
  }

  function onPropertyChanged(prop, value, oldValue, target, path, root) {
    if (value !== oldValue && !(nan(value) && nan(oldValue)) && root.__c_) {
      var rootName = getRootName(prop, path);
      for (var i = 0, len = root.__c_.length; i < len; i++) {
        var handler = root.__c_[i];
        if (handler.all || isInArray(handler.eventPropArr, rootName) || rootName.indexOf('Array-') === 0) {
          handler.propChanged.call(target, prop, value, oldValue, path);
        }
      }
    }

    if (prop.indexOf('Array-') !== 0 && typeof value === 'object') {
      watch(target, prop, target.__o_.__p_, root);
    }
  }

  function isFunction(obj) {
    return Object.prototype.toString.call(obj) == '[object Function]';
  }

  function nan(value) {
    return typeof value === "number" && isNaN(value);
  }

  function isArray(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  }

  function isString(obj) {
    return typeof obj === 'string';
  }

  function isInArray(arr, item) {
    for (var i = arr.length; --i > -1;) {
      if (item === arr[i]) return true;
    }
    return false;
  }

  function getRootName(prop, path) {
    if (path === '#') {
      return prop;
    }
    return path.split('-')[1];
  }

  obaa.add = function (obj, prop) {
    watch(obj, prop, obj.__o_.__p_, obj.__o_.__r_);
  };

  obaa.set = function (obj, prop, value) {
    if (obj[prop] === undefined) {
      watch(obj, prop, obj.__o_.__p_, obj.__o_.__r_);
    }
    obj[prop] = value;
  };

  Array.prototype.size = function (length) {
    this.length = length;
  };

  var svgNS = "http://www.w3.org/2000/svg";
  var xlink = "http://www.w3.org/1999/xlink";
  var $ = function $(el, attr) {
    if (attr) {
      if (typeof el == "string") {
        el = $(el);
      }
      for (var key in attr) {
        if (attr.hasOwnProperty(key)) {
          if (key.substring(0, 6) == "xlink:") {
            el.setAttributeNS(xlink, key.substring(6), String(attr[key]));
          } else {
            el.setAttribute(key, String(attr[key]));
          }
        }
      }
    } else {
      el = document.createElementNS("http://www.w3.org/2000/svg", el);
      el.style && (el.style.webkitTapHighlightColor = "rgba(0,0,0,0)");
      el.opacity = el.scaleX = el.scaleY = 1;
      el.left = el.top = el.rotation = el.skewX = el.skewY = el.originX = el.originY = 0;
      el.matrix = Matrix2D.identity;
      obaa(el, ["left", "top", "scaleX", "scaleY", "rotation", "skewX", "skewY", "originX", "originY"], function () {

        this.matrix.identity().appendTransform(this.left, this.top, this.scaleX, this.scaleY, this.rotation, this.skewX, this.skewY, this.originX, this.originY);

        $(el, { "transform": "matrix(" + this.matrix.a + "," + this.matrix.b + "," + this.matrix.c + "," + this.matrix.d + "," + this.matrix.tx + "," + this.matrix.ty + ")" });
      });

      obaa(el, ["opacity"], function () {
        el.setAttribute("opacity", this.opacity);
      });

      el.attr = function (attr, value) {
        if (arguments.length === 1) {
          if (typeof attr === "string") {
            if (attr.indexOf(":") !== -1) {
              return this.getAttributeNS(svgNS, attr);
            } else {
              return this.getAttribute(attr);
            }
          } else {
            return $(this, attr);
          }
        } else {
          var obj = {};
          obj[attr] = value;
          return $(this, obj);
        }
      };
    }

    return el;
  };

  var _Sving = function _Sving(selector, width, height) {
    this.parent = typeof selector === "string" ? document.querySelector(selector) : selector;
    this.svg = document.createElementNS(svgNS, "svg");
    //debug  'style', 'border: 1px solid black
    this.svg.setAttribute('style', 'border: 1px solid blackoverflow: hidden');

    this.svg.setAttribute('width', width);
    this.svg.setAttribute('height', height);
    this.svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
    this.parent.appendChild(this.svg);
  };

  _Sving.prototype = {
    line: function line(x1, y1, x2, y2, color) {
      var line = $("line", { x1: x1, y1: y1, x2: x2, y2: y2 });
      this.svg.appendChild(line);

      return line;
    },
    rect: function rect(width, height) {
      var rect = $("rect", { width: width, height: height });
      this.svg.appendChild(rect);

      return rect;
    },
    text: function text(str, font) {
      var text = $("text");
      text.style.font = font;
      text.textContent = str;
      this.svg.appendChild(text);
      return text;
    },
    circle: function circle(r) {
      var circle = $("circle", { r: r });
      this.svg.appendChild(circle);
      return circle;
    },
    //   image   group
    path: function path(d) {

      var path = $("path", { d: d });
      path.to = _Sving.pathTo;
      this.svg.appendChild(path);
      return path;
    },
    ellipse: function ellipse(rx, ry) {

      var ellipse = $("ellipse", { rx: rx, ry: ry });
      this.svg.appendChild(ellipse);
      return ellipse;
    },
    image: function image(imgOrSrc) {
      if (typeof imgOrSrc === "string") {
        var image = $("image", { "xlink:href": imgOrSrc });
        var tempImage = new Image();
        tempImage.onload = function () {
          image.attr({ width: tempImage.width, height: tempImage.height });
          tempImage = null;
        };
        tempImage.src = imgOrSrc;
      } else {
        var image = $("image", { "xlink:href": imgOrSrc, width: imgOrSrc.width, height: imgOrSrc.height });
      }
      this.svg.appendChild(image);
      return image;
    },
    group: function group() {
      var group = $("g");
      this.svg.appendChild(group);
      var i = 0,
          len = arguments.length;
      for (; i < len; i++) {
        group.appendChild(arguments[i]);
      }
      group.add = function (child) {
        group.appendChild(child);
      };
      group.remove = function (child) {
        group.removeChild(child);
      };
      return group;
    },
    remove: function remove(child) {
      this.svg.removeChild(child);
    }
  };

  var Sving = function Sving(selector, width, height) {

    return new _Sving(selector, width, height);
  };

  window.Sving = Sving;

  if (typeof module != 'undefined') module.exports = Sving;else self.sving = Sving;

}());
//# sourceMappingURL=sving.dev.js.map
