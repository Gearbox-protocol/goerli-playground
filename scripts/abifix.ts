import fs from 'fs';
import path from 'path';

const fixVyperAbis = async function(startDir: string) {
    const names = fs.readdirSync(startDir, { withFileTypes: true });
    for (let name of names) {
        if (name.isDirectory()) {
            if (name.name.match('^.*\.vy$')) {
                let files = fs.readdirSync(path.resolve(startDir, name.name))
                let jsonPath = path.resolve(startDir, name.name, files[0])
                let cont = JSON.parse(fs.readFileSync(jsonPath, {encoding: "utf-8"}))
                cont.abi = cont.abi.map((sig: any) => {
                    const {gas, ...cleanSig} = sig;
                    return cleanSig
                })
                fs.writeFileSync(jsonPath, JSON.stringify(cont))
            } else {
                fixVyperAbis(path.resolve(startDir, name.name))
            }
        }
    }
}

fixVyperAbis('./artifacts')
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
