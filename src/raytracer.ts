const MAX_DEPTH = 2
interface Material extends Color {
    albedo: number
    reflectivity: number
}
interface Color {
    r: number
    g: number
    b: number
}

interface Light {
    direction: Vector3
    color: Color
    intensity: number
}


class Ray {
    origin: Vector3
    direction: Vector3

    constructor(origin: Vector3, direction: Vector3) {
        this.origin = origin
        this.direction = direction.normalize()
    }
}

class Scene {
    width: number
    height: number
    fov: number
    light: Light
    objects: Array<Object>
    shadowBias = 1e-6

    constructor(width: number, height: number, fov: number, light: Light) {
        this.width = width
        this.height = height
        this.fov = fov
        this.objects = []
        this.light = light
    }

    add(obj: Object) {
        this.objects.push(obj)
    }

    createPrime(x: number, y: number): Ray {
        let fov_adjustement = Math.tan(this.fov / 2)
        let aspect_ratio = this.width / this.height
        let senX = (((x + 0.5) / this.width) * 2.0 - 1.0) * aspect_ratio * fov_adjustement
        let senY = 1.0 - ((y + 0.5) / this.height) * 2.0 * fov_adjustement

        let origin = new Vector3(0, 0, 0)
        return new Ray(origin, new Vector3(senX, senY, -1))
    }

    /**
     * Returns index of intersecting object
     * @param ray ray to intersect
     */
    intersect(ray: Ray): number | null {
        let min = Infinity
        let minIdx = null
        for (let i = 0; i < this.objects.length; i++) {
            let obj = this.objects[i]
            let int = obj.intersect(ray)
            if (int !== null && int < min) {
                min = int
                minIdx = i
            }
        }
        return minIdx
    }

    render(cvs: HTMLCanvasElement) {
        cvs.width = this.width
        cvs.height = this.height

        let ctx = cvs.getContext('2d')!

        let imgdata = ctx.createImageData(this.width, this.height)
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                let pixel: number = 4 * (y * this.width + x)
                let ray = this.createPrime(x, y)

                let color = this.handleRay(ray)
                color = color || { r: 0.6, g: 0.8, b: 1 }; // bg color
                imgdata.data[pixel + 0] = Math.ceil(255 * color.r)
                imgdata.data[pixel + 1] = Math.ceil(255 * color.g)
                imgdata.data[pixel + 2] = Math.ceil(255 * color.b)
                imgdata.data[pixel + 3] = 255
            }
        }
        ctx.putImageData(imgdata, 0, 0)
    }

    update(transform: (v: Vector3) => Vector3) {
        for (let obj of this.objects) {
            obj.update(transform)
        }
    }

    handleRay(ray: Ray | null, accFactor = 1): Color | null {
        if (ray == null || accFactor < 1e-6) return null
        let closest = Infinity
        let color = null
        for (let idx = 0; idx < this.objects.length; idx++) {
            let obj = this.objects[idx]
            let dist = obj.intersect(ray)
            if (dist != null && dist < closest) {
                closest = dist
                let hitPoint = ray.direction
                    .scale(dist)
                    .displace(ray.origin)
                let surfaceNormal = obj.surfaceNormal(hitPoint)
                let lightDir = this.light.direction.scale(-1)

                let shadowOrigin = hitPoint.add(surfaceNormal.scale(this.shadowBias))
                const shadowRay = new Ray(shadowOrigin, lightDir)

                let anyIntersects = false
                for (let obj1 of this.objects) {
                    let int = obj1.intersect(shadowRay)
                    if (int != null) {
                        anyIntersects = true
                        break
                    }
                }

                let intensity = anyIntersects ? 0 : Math.max(surfaceNormal.dot(lightDir), 0) * this.light.intensity
                let lightReflected = obj.material.albedo / Math.PI
                let color0 = obj.material
                color = {
                    r: color0.r * this.light.color.r * intensity * lightReflected,
                    g: color0.g * this.light.color.g * intensity * lightReflected,
                    b: color0.b * this.light.color.b * intensity * lightReflected,
                }

                let reflectedRay = reflect(ray.origin, shadowOrigin, surfaceNormal)
                let colorReflected = this.handleRay(reflectedRay, accFactor * obj.material.reflectivity)
                if (colorReflected != null) color = combine(color, colorReflected, obj.material.reflectivity)
            }
        }
        if (color != null) clamp(color)
        return color
    }
}

function combine(left: Color, right: Color, factor: number) {
    return {
        r: left.r * (1 - factor) + right.r * factor,
        g: left.g * (1 - factor) + right.g * factor,
        b: left.b * (1 - factor) + right.b * factor,
    }
}

function reflect(origin: Vector3, hitPoint: Vector3, normal: Vector3): Ray {
    let incident = hitPoint.subtract(origin)
    let d = normal.scale(2 * incident.dot(normal))
    return {
        origin: hitPoint,
        direction: incident.subtract(d),
    }
}