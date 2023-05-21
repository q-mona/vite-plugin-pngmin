import * as fs from 'fs'
import * as path from 'path'
import { execa } from 'execa'

const pngquant = path.join(__dirname, 'exe', 'pngquant.exe')
const b64Reg = /^export default (\"data:image\/png;base64,[A-Za-z0-9+/=]*\")$/

async function compress(
    imgBuffer: Buffer,
    imgPath: string
): Promise<Buffer | string> {
    let buffer: Buffer | string = imgBuffer
    try {
        const res = await execa(pngquant, ['-'], {
            encoding: null,
            maxBuffer: Infinity,
            input: imgBuffer,
        })

        buffer = res.stdout
    } catch {
        throw `image compress error: ${imgPath}`
    } finally {
        return buffer
    }
}

export default function pngmin() {
    let outDir: string, publicDir: string

    return {
        name: 'vite:pngmin',
        apply: 'build',
        configResolved(config) {
            if (typeof config.publicDir === 'string') {
                publicDir = config.publicDir
            }
            outDir = config.build.outDir
        },
        async transform(code: string, id: string) {
            const extname = path.extname(id)
            if (extname === '.png' && b64Reg.test(code)) {
                const imgBuffer = fs.readFileSync(id)
                const source = await compress(imgBuffer, id)
                return `export default "data:image/png;base64,${source.toString(
                    'base64'
                )}"`
            }
        },
        async generateBundle(_, bundle) {
            const imgPaths: string[] = []
            Object.keys(bundle).forEach((key: string) => {
                const extname = path.extname(key)
                if (extname === '.png') {
                    imgPaths.push(key)
                }
            })

            const handles = imgPaths.map(async (imgPath: string) => {
                const source = await compress(bundle[imgPath].source, imgPath)
                bundle[imgPath].source = source
            })

            await Promise.all(handles)
        },
        async closeBundle() {
            if (typeof publicDir !== 'string') return

            const getImgPath = (imgPath: string) => {
                const res: string[] = []
                if (fs.existsSync(imgPath)) {
                    const stat = fs.lstatSync(imgPath)
                    if (stat.isDirectory()) {
                        const files = fs.readdirSync(imgPath)
                        files.forEach((file) => {
                            const temp = getImgPath(path.join(imgPath, file))
                            res.push(...temp)
                        })
                    } else if (path.extname(imgPath) === '.png')
                        res.push(imgPath)
                }
                return res
            }

            const imgPaths = getImgPath(publicDir)
            const handles = imgPaths.map(async (imgPath: string) => {
                const imgBuffer = fs.readFileSync(imgPath)
                const source = await compress(imgBuffer, imgPath)

                let targetPath = imgPath.replace(publicDir + path.sep, '')
                targetPath = path.join(outDir, targetPath)

                fs.writeFileSync(targetPath, source)
            })

            await Promise.all(handles)
        },
    }
}
