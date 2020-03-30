
class Vector3 {
    x: number
    y: number
    z: number

    constructor(x: number, y: number, z: number) {
        this.x = x
        this.y = y
        this.z = z
    }

    add(other: Vector3): Vector3 {
        return new Vector3(this.x + other.x, this.y + other.y, this.z + other.z)
    }

    dot(other: Vector3): number {
        return this.x * other.x + this.y * other.y + this.z * other.z
    }

    norm(): number {
        return Math.sqrt(this.dot(this))
    }

    scale(factor: number): Vector3 {
        return new Vector3(this.x * factor, this.y * factor, this.z * factor)
    }

    normalize(): Vector3 {
        return this.scale(1 / this.norm())
    }

    displace(point: Vector3): Vector3 {
        return new Vector3(point.x + this.x, point.y + this.y, point.z + this.z)
    }

    subtract(dest: Vector3): Vector3 {
        return new Vector3(this.x - dest.x, this.y - dest.y, this.z - dest.z)
    }

    cross(other: Vector3) {
        return new Vector3(this.y * other.z - this.z * other.y, this.z * other.x - this.x * other.z, this.x * other.y - this.y * other.x)
    }
}

function clamp(color: Color) {
    color.r = Math.max(Math.min(color.r, 1), 0)
    color.g = Math.max(Math.min(color.g, 1), 0)
    color.b = Math.max(Math.min(color.b, 1), 0)
}

class AffineTransform {
    rotation: Array<number>
    displacement: Vector3

    constructor(data: Array<number>, displacement: Vector3 = new Vector3(0, 0, 0)) {
        this.rotation = data
        this.displacement = displacement
    }

    static rotateX(degrees: number): AffineTransform {
        let data = [
            1, 0, 0,
            0, Math.cos(degrees), -Math.sin(degrees),
            0, Math.sin(degrees), Math.cos(degrees),
        ]
        return new AffineTransform(data)
    }

    static rotateY(degrees: number): AffineTransform {
        let data = [
            Math.cos(degrees), 0, -Math.sin(degrees),
            0, 1, 0,
            Math.sin(degrees), 0, Math.cos(degrees),
        ]
        return new AffineTransform(data)
    }

    static rotateZ(degrees: number): AffineTransform {
        let data = [
            Math.cos(degrees), -Math.sin(degrees), 0,
            Math.sin(degrees), Math.cos(degrees), 0,
            0, 0, 1
        ]
        return new AffineTransform(data)
    }

    static displacement(x: number, y: number, z: number): AffineTransform {
        let out = new Array(9)
        for (let i = 0; i < 9; i++) out[i] = 0;
        out[0] = out[4] = out[8] = 1;

        return new AffineTransform(out, new Vector3(x, y, z))
    }

    compose(other: AffineTransform) {
        let out = new Array(9)
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                let acc = 0
                for (let k = 0; k < 3; k++) {
                    acc += this.rotation[i * 3 + k] * other.rotation[k * 3 + j]
                }
                out[i * 3 + j] = acc
            }
        }
        let disp = this.apply(other.displacement).add(this.displacement)
        return new AffineTransform(out, disp)
    }

    apply(to: Vector3): Vector3 {
        let results = []
        for (let i = 0; i < 3; i++) {
            let res = this.rotation[i * 3 + 0] * to.x + this.rotation[i * 3 + 1] * to.y + this.rotation[i * 3 + 2] * to.z
            results.push(res)
        }
        return new Vector3(results[0], results[1], results[2]).add(this.displacement)
    }
}