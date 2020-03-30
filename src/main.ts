function main(cvs: HTMLCanvasElement) {
    let light = {
        direction: new Vector3(0, -0.3, -1).normalize(),
        color: { r: 1, g: 1, b: 1 },
        intensity: 2
    }
    let scene = new Scene(cvs.width, cvs.height, Math.PI / 2, light)

    let origin = new Vector3(0, -1, 0)
    let vector = new Vector3(0, 1, 0)
    let plane = new Plane(origin, vector, { r: 0.4, g: 0.8, b: 0.4, albedo: 1, reflectivity: 0.9 })
    scene.add(plane)
    origin = new Vector3(0, 0.25, -2)
    let sphere = new Sphere(origin, 0.5, { r: 0.8, g: 0.8, b: 0.8, albedo: 1, reflectivity: 0.5 })
    scene.add(sphere)

    origin = new Vector3(0.75, 0.75, -1.25)
    sphere = new Sphere(origin, 0.75, { r: 1, g: 0.4, b: 0.4, albedo: 1, reflectivity: 0.1 })
    scene.add(sphere)

    origin = new Vector3(-1, 1, -3)
    sphere = new Sphere(origin, 1, { r: 0.4, g: 0.4, b: 1, albedo: 1, reflectivity: 0.2 })
    scene.add(sphere)

    function getTransform(angle: number) {
        let moveOrigin = AffineTransform.displacement(0, 0, 1)
        let rotate = AffineTransform.rotateY(angle)
        let returnOrigin = AffineTransform.displacement(0, 0, -1)
        return (v: Vector3) => {
            v = moveOrigin.apply(v)
            v = rotate.apply(v)
            return returnOrigin.apply(v)
        }

    }

    let lastTime = 0
    function frame(timestamp: number) {
        let dt = (timestamp - lastTime) / 1000
        lastTime = timestamp
        let angle = dt
        scene.update(getTransform(angle))
        scene.render(cvs)
        window.requestAnimationFrame(frame)
    }
    window.requestAnimationFrame(frame)
}
