"use strict";
var Sphere = /** @class */ (function () {
    function Sphere(center, radius, material) {
        this.center = center;
        this.radius = radius;
        this.material = material;
    }
    Sphere.prototype.intersect = function (ray) {
        var C = this.center;
        // ray: P = O + t * D
        var O = ray.origin;
        var D = ray.direction;
        var L = C.subtract(O);
        var d = L.dot(D);
        var h2 = L.dot(L) - (d * d);
        var s2 = this.radius * this.radius - h2;
        if (s2 < 0) {
            // no intersection
            return null;
        }
        var s = Math.sqrt(s2);
        var t0 = d - s;
        return (t0 > 0) ? t0 : null;
    };
    Sphere.prototype.surfaceNormal = function (hitPoint) {
        return hitPoint.subtract(this.center).normalize();
    };
    Sphere.prototype.update = function (transform) {
        this.center = transform(this.center);
    };
    return Sphere;
}());
/**
 * Calculate inverse of matrix [a b; c d]
 * @param a
 * @param b
 * @param c
 * @param d
 */
function inverse(a, b, c, d) {
    var det = a * d - b * c;
    if (Math.abs(det) < 1e-13) {
        return null;
    }
    return { a: d / det, b: -c / det, c: -b / det, d: a / det };
}
var Plane = /** @class */ (function () {
    function Plane(point, normal, color) {
        this.origin = point;
        this.normal = normal;
        this.material = color;
    }
    Plane.prototype.intersect = function (ray) {
        var proj = this.normal.dot(ray.direction);
        if (proj < 0) {
            var d = this.origin.subtract(ray.origin).dot(this.normal) / proj;
            // ray: p = ray.origin + ray.direction * d
            if (d >= 0) {
                return d;
            }
        }
        return null;
    };
    Plane.prototype.surfaceNormal = function (hitPoint) {
        return this.normal;
    };
    Plane.prototype.update = function () {
        // pass
    };
    return Plane;
}());
var MAX_DEPTH = 2;
var Ray = /** @class */ (function () {
    function Ray(origin, direction) {
        this.origin = origin;
        this.direction = direction.normalize();
    }
    return Ray;
}());
var Scene = /** @class */ (function () {
    function Scene(width, height, fov, light) {
        this.shadowBias = 1e-6;
        this.width = width;
        this.height = height;
        this.fov = fov;
        this.objects = [];
        this.light = light;
    }
    Scene.prototype.add = function (obj) {
        this.objects.push(obj);
    };
    Scene.prototype.createPrime = function (x, y) {
        var fov_adjustement = Math.tan(this.fov / 2);
        var aspect_ratio = this.width / this.height;
        var senX = (((x + 0.5) / this.width) * 2.0 - 1.0) * aspect_ratio * fov_adjustement;
        var senY = 1.0 - ((y + 0.5) / this.height) * 2.0 * fov_adjustement;
        var origin = new Vector3(0, 0, 0);
        return new Ray(origin, new Vector3(senX, senY, -1));
    };
    /**
     * Returns index of intersecting object
     * @param ray ray to intersect
     */
    Scene.prototype.intersect = function (ray) {
        var min = Infinity;
        var minIdx = null;
        for (var i = 0; i < this.objects.length; i++) {
            var obj = this.objects[i];
            var int = obj.intersect(ray);
            if (int !== null && int < min) {
                min = int;
                minIdx = i;
            }
        }
        return minIdx;
    };
    Scene.prototype.render = function (cvs) {
        cvs.width = this.width;
        cvs.height = this.height;
        var ctx = cvs.getContext('2d');
        var imgdata = ctx.createImageData(this.width, this.height);
        for (var x = 0; x < this.width; x++) {
            for (var y = 0; y < this.height; y++) {
                var pixel = 4 * (y * this.width + x);
                var ray = this.createPrime(x, y);
                var color = this.handleRay(ray);
                color = color || { r: 0.6, g: 0.8, b: 1 }; // bg color
                imgdata.data[pixel + 0] = Math.ceil(255 * color.r);
                imgdata.data[pixel + 1] = Math.ceil(255 * color.g);
                imgdata.data[pixel + 2] = Math.ceil(255 * color.b);
                imgdata.data[pixel + 3] = 255;
            }
        }
        ctx.putImageData(imgdata, 0, 0);
    };
    Scene.prototype.update = function (transform) {
        for (var _i = 0, _a = this.objects; _i < _a.length; _i++) {
            var obj = _a[_i];
            obj.update(transform);
        }
    };
    Scene.prototype.handleRay = function (ray, accFactor) {
        if (accFactor === void 0) { accFactor = 1; }
        if (ray == null || accFactor < 1e-6)
            return null;
        var closest = Infinity;
        var color = null;
        for (var idx = 0; idx < this.objects.length; idx++) {
            var obj = this.objects[idx];
            var dist = obj.intersect(ray);
            if (dist != null && dist < closest) {
                closest = dist;
                var hitPoint = ray.direction
                    .scale(dist)
                    .displace(ray.origin);
                var surfaceNormal = obj.surfaceNormal(hitPoint);
                var lightDir = this.light.direction.scale(-1);
                var shadowOrigin = hitPoint.add(surfaceNormal.scale(this.shadowBias));
                var shadowRay = new Ray(shadowOrigin, lightDir);
                var anyIntersects = false;
                for (var _i = 0, _a = this.objects; _i < _a.length; _i++) {
                    var obj1 = _a[_i];
                    var int = obj1.intersect(shadowRay);
                    if (int != null) {
                        anyIntersects = true;
                        break;
                    }
                }
                var intensity = anyIntersects ? 0 : Math.max(surfaceNormal.dot(lightDir), 0) * this.light.intensity;
                var lightReflected = obj.material.albedo / Math.PI;
                var color0 = obj.material;
                color = {
                    r: color0.r * this.light.color.r * intensity * lightReflected,
                    g: color0.g * this.light.color.g * intensity * lightReflected,
                    b: color0.b * this.light.color.b * intensity * lightReflected,
                };
                var reflectedRay = reflect(ray.origin, shadowOrigin, surfaceNormal);
                var colorReflected = this.handleRay(reflectedRay, accFactor * obj.material.reflectivity);
                if (colorReflected != null)
                    color = combine(color, colorReflected, obj.material.reflectivity);
            }
        }
        if (color != null)
            clamp(color);
        return color;
    };
    return Scene;
}());
function combine(left, right, factor) {
    return {
        r: left.r * (1 - factor) + right.r * factor,
        g: left.g * (1 - factor) + right.g * factor,
        b: left.b * (1 - factor) + right.b * factor,
    };
}
function reflect(origin, hitPoint, normal) {
    var incident = hitPoint.subtract(origin);
    var d = normal.scale(2 * incident.dot(normal));
    return {
        origin: hitPoint,
        direction: incident.subtract(d),
    };
}
var Vector3 = /** @class */ (function () {
    function Vector3(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    Vector3.prototype.add = function (other) {
        return new Vector3(this.x + other.x, this.y + other.y, this.z + other.z);
    };
    Vector3.prototype.dot = function (other) {
        return this.x * other.x + this.y * other.y + this.z * other.z;
    };
    Vector3.prototype.norm = function () {
        return Math.sqrt(this.dot(this));
    };
    Vector3.prototype.scale = function (factor) {
        return new Vector3(this.x * factor, this.y * factor, this.z * factor);
    };
    Vector3.prototype.normalize = function () {
        return this.scale(1 / this.norm());
    };
    Vector3.prototype.displace = function (point) {
        return new Vector3(point.x + this.x, point.y + this.y, point.z + this.z);
    };
    Vector3.prototype.subtract = function (dest) {
        return new Vector3(this.x - dest.x, this.y - dest.y, this.z - dest.z);
    };
    Vector3.prototype.cross = function (other) {
        return new Vector3(this.y * other.z - this.z * other.y, this.z * other.x - this.x * other.z, this.x * other.y - this.y * other.x);
    };
    return Vector3;
}());
function clamp(color) {
    color.r = Math.max(Math.min(color.r, 1), 0);
    color.g = Math.max(Math.min(color.g, 1), 0);
    color.b = Math.max(Math.min(color.b, 1), 0);
}
var AffineTransform = /** @class */ (function () {
    function AffineTransform(data, displacement) {
        if (displacement === void 0) { displacement = new Vector3(0, 0, 0); }
        this.rotation = data;
        this.displacement = displacement;
    }
    AffineTransform.rotateX = function (degrees) {
        var data = [
            1, 0, 0,
            0, Math.cos(degrees), -Math.sin(degrees),
            0, Math.sin(degrees), Math.cos(degrees),
        ];
        return new AffineTransform(data);
    };
    AffineTransform.rotateY = function (degrees) {
        var data = [
            Math.cos(degrees), 0, -Math.sin(degrees),
            0, 1, 0,
            Math.sin(degrees), 0, Math.cos(degrees),
        ];
        return new AffineTransform(data);
    };
    AffineTransform.rotateZ = function (degrees) {
        var data = [
            Math.cos(degrees), -Math.sin(degrees), 0,
            Math.sin(degrees), Math.cos(degrees), 0,
            0, 0, 1
        ];
        return new AffineTransform(data);
    };
    AffineTransform.displacement = function (x, y, z) {
        var out = new Array(9);
        for (var i = 0; i < 9; i++)
            out[i] = 0;
        out[0] = out[4] = out[8] = 1;
        return new AffineTransform(out, new Vector3(x, y, z));
    };
    AffineTransform.prototype.compose = function (other) {
        var out = new Array(9);
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                var acc = 0;
                for (var k = 0; k < 3; k++) {
                    acc += this.rotation[i * 3 + k] * other.rotation[k * 3 + j];
                }
                out[i * 3 + j] = acc;
            }
        }
        var disp = this.apply(other.displacement).add(this.displacement);
        return new AffineTransform(out, disp);
    };
    AffineTransform.prototype.apply = function (to) {
        var results = [];
        for (var i = 0; i < 3; i++) {
            var res = this.rotation[i * 3 + 0] * to.x + this.rotation[i * 3 + 1] * to.y + this.rotation[i * 3 + 2] * to.z;
            results.push(res);
        }
        return new Vector3(results[0], results[1], results[2]).add(this.displacement);
    };
    return AffineTransform;
}());
