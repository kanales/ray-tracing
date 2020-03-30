interface Intersectable {
    intersect(ray: Ray): number | null
    surfaceNormal(hit_point: Vector3): Vector3
}

interface Drawable {
    material: Material
}

interface Object extends Intersectable, Drawable {
    update(transform: (v: Vector3) => Vector3): void
}


class Sphere implements Object {
    center: Vector3
    radius: number
    material: Material

    constructor(center: Vector3, radius: number, material: Material) {
        this.center = center
        this.radius = radius
        this.material = material
    }
    intersect(ray: Ray): number | null {
        let C = this.center

        // ray: P = O + t * D
        let O = ray.origin
        let D = ray.direction

        let L = C.subtract(O)

        let d = L.dot(D)
        let h2 = L.dot(L) - (d * d)
        let s2 = this.radius * this.radius - h2
        if (s2 < 0) {
            // no intersection
            return null
        }

        let s = Math.sqrt(s2)
        let t0 = d - s
        return (t0 > 0) ? t0 : null
    }

    surfaceNormal(hitPoint: Vector3): Vector3 {
        return hitPoint.subtract(this.center).normalize()
    }

    update(transform: (v: Vector3) => Vector3) {
        this.center = transform(this.center)
    }
}

/**
 * Calculate inverse of matrix [a b; c d]
 * @param a 
 * @param b 
 * @param c 
 * @param d 
 */
function inverse(a: number, b: number, c: number, d: number): { a: number, b: number, c: number, d: number } | null {
    let det = a * d - b * c
    if (Math.abs(det) < 1e-13) {
        return null
    }
    return { a: d / det, b: - c / det, c: -b / det, d: a / det }
}

interface Texture {
    height: number
    width: number
    data: Array<Color>
}

class Plane implements Object {
    origin: Vector3
    normal: Vector3
    material: Material

    constructor(point: Vector3, normal: Vector3, color: Material) {
        this.origin = point
        this.normal = normal

        this.material = color
    }

    intersect(ray: Ray): number | null {
        let proj = this.normal.dot(ray.direction)

        if (proj < 0) {
            let d = this.origin.subtract(ray.origin).dot(this.normal) / proj
            // ray: p = ray.origin + ray.direction * d
            if (d >= 0) {
                return d
            }
        }
        return null
    }

    surfaceNormal(hitPoint: Vector3): Vector3 {
        return this.normal
    }

    update() {
        // pass
    }
}