!function() {
    'use strict';
    function Matrix2D(a, b, c, d, tx, ty) {
        this.setValues(a, b, c, d, tx, ty);
    }
    Matrix2D.DEG_TO_RAD = Math.PI / 180;
    Matrix2D.identity = null;
    Matrix2D.prototype = {
        setValues: function(a, b, c, d, tx, ty) {
            this.a = null == a ? 1 : a;
            this.b = b || 0;
            this.c = c || 0;
            this.d = null == d ? 1 : d;
            this.tx = tx || 0;
            this.ty = ty || 0;
            return this;
        },
        append: function(a, b, c, d, tx, ty) {
            var a1 = this.a;
            var b1 = this.b;
            var c1 = this.c;
            var d1 = this.d;
            if (1 != a || 0 != b || 0 != c || 1 != d) {
                this.a = a1 * a + c1 * b;
                this.b = b1 * a + d1 * b;
                this.c = a1 * c + c1 * d;
                this.d = b1 * c + d1 * d;
            }
            this.tx = a1 * tx + c1 * ty + this.tx;
            this.ty = b1 * tx + d1 * ty + this.ty;
            return this;
        },
        appendTransform: function(x, y, scaleX, scaleY, rotation, skewX, skewY, regX, regY) {
            if (rotation % 360) {
                var r = rotation * Matrix2D.DEG_TO_RAD;
                var cos = Math.cos(r);
                var sin = Math.sin(r);
            } else {
                cos = 1;
                sin = 0;
            }
            if (skewX || skewY) {
                skewX *= Matrix2D.DEG_TO_RAD;
                skewY *= Matrix2D.DEG_TO_RAD;
                this.append(Math.cos(skewY), Math.sin(skewY), -Math.sin(skewX), Math.cos(skewX), x, y);
                this.append(cos * scaleX, sin * scaleX, -sin * scaleY, cos * scaleY, 0, 0);
            } else this.append(cos * scaleX, sin * scaleX, -sin * scaleY, cos * scaleY, x, y);
            if (regX || regY) {
                this.tx -= regX * this.a + regY * this.c;
                this.ty -= regX * this.b + regY * this.d;
            }
            return this;
        },
        identity: function() {
            this.a = this.d = 1;
            this.b = this.c = this.tx = this.ty = 0;
            return this;
        },
        copy: function(matrix) {
            return this.setValues(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty);
        },
        clone: function() {
            return new Matrix2D(this.a, this.b, this.c, this.d, this.tx, this.ty);
        },
        toString: function() {
            return "[Matrix2D (a=" + this.a + " b=" + this.b + " c=" + this.c + " d=" + this.d + " tx=" + this.tx + " ty=" + this.ty + ")]";
        }
    };
    Matrix2D.identity = new Matrix2D();
    var observe = function observe(target, arr, callback) {
        var _observe = function(target, arr, callback) {
            if (!target.$observer) target.$observer = this;
            var $observer = target.$observer;
            var eventPropArr = [];
            if (observe.isArray(target)) {
                if (0 === target.length) {
                    target.$observeProps = {};
                    target.$observeProps.$observerPath = "#";
                }
                $observer.mock(target);
            }
            for (var prop in target) if (target.hasOwnProperty(prop)) if (callback) {
                if (observe.isArray(arr) && observe.isInArray(arr, prop)) {
                    eventPropArr.push(prop);
                    $observer.watch(target, prop);
                } else if (observe.isString(arr) && prop == arr) {
                    eventPropArr.push(prop);
                    $observer.watch(target, prop);
                }
            } else {
                eventPropArr.push(prop);
                $observer.watch(target, prop);
            }
            $observer.target = target;
            if (!$observer.propertyChangedHandler) $observer.propertyChangedHandler = [];
            var propChanged = callback ? callback : arr;
            $observer.propertyChangedHandler.push({
                all: !callback,
                propChanged: propChanged,
                eventPropArr: eventPropArr
            });
        };
        _observe.prototype = {
            onPropertyChanged: function(prop, value, oldValue, target, path) {
                if (value !== oldValue && this.propertyChangedHandler) {
                    var rootName = observe.e(prop, path);
                    for (var i = 0, len = this.propertyChangedHandler.length; i < len; i++) {
                        var handler = this.propertyChangedHandler[i];
                        if (handler.all || observe.isInArray(handler.eventPropArr, rootName) || 0 === rootName.indexOf("Array-")) handler.propChanged.call(this.target, prop, value, oldValue, path);
                    }
                }
                if (0 !== prop.indexOf("Array-") && "object" == typeof value) this.watch(target, prop, target.$observeProps.$observerPath);
            },
            mock: function(target) {
                var self = this;
                observe.methods.forEach(function(item) {
                    target[item] = function() {
                        var old = Array.prototype.slice.call(this, 0);
                        var result = Array.prototype[item].apply(this, Array.prototype.slice.call(arguments));
                        if (new RegExp("\\b" + item + "\\b").test(observe.triggerStr)) {
                            for (var cprop in this) if (this.hasOwnProperty(cprop) && !observe.isFunction(this[cprop])) self.watch(this, cprop, this.$observeProps.$observerPath);
                            self.onPropertyChanged("Array-" + item, this, old, this, this.$observeProps.$observerPath);
                        }
                        return result;
                    };
                });
            },
            watch: function(target, prop, path) {
                if ("$observeProps" !== prop && "$observer" !== prop) if (!observe.isFunction(target[prop])) {
                    if (!target.$observeProps) target.$observeProps = {};
                    if (void 0 !== path) target.$observeProps.$observerPath = path; else target.$observeProps.$observerPath = "#";
                    var self = this;
                    var currentValue = target.$observeProps[prop] = target[prop];
                    Object.defineProperty(target, prop, {
                        get: function() {
                            return this.$observeProps[prop];
                        },
                        set: function(value) {
                            var old = this.$observeProps[prop];
                            this.$observeProps[prop] = value;
                            self.onPropertyChanged(prop, value, old, this, target.$observeProps.$observerPath);
                        }
                    });
                    if ("object" == typeof currentValue) {
                        if (observe.isArray(currentValue)) {
                            this.mock(currentValue);
                            if (0 === currentValue.length) {
                                if (!currentValue.$observeProps) currentValue.$observeProps = {};
                                if (void 0 !== path) currentValue.$observeProps.$observerPath = path; else currentValue.$observeProps.$observerPath = "#";
                            }
                        }
                        for (var cprop in currentValue) if (currentValue.hasOwnProperty(cprop)) this.watch(currentValue, cprop, target.$observeProps.$observerPath + "-" + prop);
                    }
                }
            }
        };
        return new _observe(target, arr, callback);
    };
    observe.methods = [ "concat", "every", "filter", "forEach", "indexOf", "join", "lastIndexOf", "map", "pop", "push", "reduce", "reduceRight", "reverse", "shift", "slice", "some", "sort", "splice", "unshift", "toLocaleString", "toString", "size" ];
    observe.triggerStr = [ "concat", "pop", "push", "reverse", "shift", "sort", "splice", "unshift", "size" ].join(",");
    observe.isArray = function(obj) {
        return '[object Array]' === Object.prototype.toString.call(obj);
    };
    observe.isString = function(obj) {
        return "string" == typeof obj;
    };
    observe.isInArray = function(arr, item) {
        for (var i = arr.length; --i > -1; ) if (item === arr[i]) return !0;
        return !1;
    };
    observe.isFunction = function(obj) {
        return '[object Function]' == Object.prototype.toString.call(obj);
    };
    observe.twoWay = function(objA, aProp, objB, bProp) {
        if ("object" == typeof objA[aProp] && "object" == typeof objB[bProp]) {
            observe(objA, aProp, function(name, value) {
                objB[bProp] = this[aProp];
            });
            observe(objB, bProp, function(name, value) {
                objA[aProp] = this[bProp];
            });
        } else {
            observe(objA, aProp, function(name, value) {
                objB[bProp] = value;
            });
            observe(objB, bProp, function(name, value) {
                objA[aProp] = value;
            });
        }
    };
    observe.e = function(prop, path) {
        if ("#" === path) return prop; else return path.split("-")[1];
    };
    observe.add = function(obj, prop, value) {
        obj[prop] = value;
        var $observer = obj.$observer;
        $observer.watch(obj, prop);
    };
    Array.prototype.size = function(length) {
        this.length = length;
    };
    var svgNS = "http://www.w3.org/2000/svg";
    var $ = function $(el, attr) {
        if (attr) {
            if ("string" == typeof el) el = $(el);
            for (var key in attr) if (attr.hasOwnProperty(key)) if ("xlink:" == key.substring(0, 6)) el.setAttributeNS("http://www.w3.org/1999/xlink", key.substring(6), String(attr[key])); else el.setAttribute(key, String(attr[key]));
        } else {
            el = document.createElementNS("http://www.w3.org/2000/svg", el);
            el.style && (el.style.webkitTapHighlightColor = "rgba(0,0,0,0)");
            el.opacity = el.scaleX = el.scaleY = 1;
            el.left = el.top = el.rotation = el.skewX = el.skewY = el.originX = el.originY = 0;
            el.matrix = Matrix2D.identity;
            observe(el, [ "left", "top", "scaleX", "scaleY", "rotation", "skewX", "skewY", "originX", "originY" ], function() {
                this.matrix.identity().appendTransform(this.left, this.top, this.scaleX, this.scaleY, this.rotation, this.skewX, this.skewY, this.originX, this.originY);
                $(el, {
                    transform: "matrix(" + this.matrix.a + "," + this.matrix.b + "," + this.matrix.c + "," + this.matrix.d + "," + this.matrix.tx + "," + this.matrix.ty + ")"
                });
            });
            observe(el, [ "opacity" ], function() {
                el.setAttribute("opacity", this.opacity);
            });
            el.attr = function(attr, value) {
                if (1 === arguments.length) if ("string" == typeof attr) if (-1 !== attr.indexOf(":")) return this.getAttributeNS(svgNS, attr); else return this.getAttribute(attr); else return $(this, attr); else {
                    var obj = {};
                    obj[attr] = value;
                    return $(this, obj);
                }
            };
        }
        return el;
    };
    var _Sving = function(selector, width, height) {
        this.parent = "string" == typeof selector ? document.querySelector(selector) : selector;
        this.svg = document.createElementNS(svgNS, "svg");
        this.svg.setAttribute('style', 'border: 1px solid blackoverflow: hidden');
        this.svg.setAttribute('width', width);
        this.svg.setAttribute('height', height);
        this.svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
        this.parent.appendChild(this.svg);
    };
    _Sving.prototype = {
        line: function(x1, y1, x2, y2, color) {
            var line = $("line", {
                x1: x1,
                y1: y1,
                x2: x2,
                y2: y2
            });
            this.svg.appendChild(line);
            return line;
        },
        rect: function(width, height) {
            var rect = $("rect", {
                width: width,
                height: height
            });
            this.svg.appendChild(rect);
            return rect;
        },
        text: function(str, font) {
            var text = $("text");
            text.style.font = font;
            text.textContent = str;
            this.svg.appendChild(text);
            return text;
        },
        circle: function(r) {
            var circle = $("circle", {
                r: r
            });
            this.svg.appendChild(circle);
            return circle;
        },
        path: function(d) {
            var path = $("path", {
                d: d
            });
            path.to = _Sving.pathTo;
            this.svg.appendChild(path);
            return path;
        },
        ellipse: function(rx, ry) {
            var ellipse = $("ellipse", {
                rx: rx,
                ry: ry
            });
            this.svg.appendChild(ellipse);
            return ellipse;
        },
        image: function(imgOrSrc) {
            if ("string" == typeof imgOrSrc) {
                var image = $("image", {
                    "xlink:href": imgOrSrc
                });
                var tempImage = new Image();
                tempImage.onload = function() {
                    image.attr({
                        width: tempImage.width,
                        height: tempImage.height
                    });
                    tempImage = null;
                };
                tempImage.src = imgOrSrc;
            } else var image = $("image", {
                "xlink:href": imgOrSrc,
                width: imgOrSrc.width,
                height: imgOrSrc.height
            });
            this.svg.appendChild(image);
            return image;
        },
        group: function() {
            var group = $("g");
            this.svg.appendChild(group);
            var i = 0, len = arguments.length;
            for (;i < len; i++) group.appendChild(arguments[i]);
            group.add = function(child) {
                group.appendChild(child);
            };
            group.remove = function(child) {
                group.removeChild(child);
            };
            return group;
        },
        remove: function(child) {
            this.svg.removeChild(child);
        }
    };
    var Sving = function(selector, width, height) {
        return new _Sving(selector, width, height);
    };
    window.Sving = Sving;
    if ('undefined' != typeof module) module.exports = Sving; else self.sving = Sving;
}();
//# sourceMappingURL=sving.js.map