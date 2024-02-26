const puppeteer = require("puppeteer");
const fs = require("fs/promises");

(async () => {
  let browser;

  try {
    browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    const codigos = await fs.readFile("expedientes.txt", "utf-8");
    const codigosArray = codigos
      .split("\n")
      .filter((linea) => linea.trim() !== "");
    const codigosLimpios = codigosArray.map((codigo) => codigo.trim());
    const objeto = {};

    for (const codigo of codigosLimpios) {
      await page.goto(
        "https://www.anses.gob.ar/consultas/consulta-de-expediente"
      );

      try {
        await page.waitForSelector("#edit-nro-expediente", { timeout: 3000 });
      } catch (error) {
        console.error(
          `El selector '#edit-nro-expediente' no se encontró en la página. Pasando al siguiente expediente.`
        );
        continue;
      }

      await page.type("#edit-nro-expediente", codigo);
      await page.click("#edit-submit");

      await new Promise((resolve) => setTimeout(resolve, 1000));

      try {
        await page.waitForSelector("[class=container]", { timeout: 5000 });
        const small = await page.$eval(
          "div.constancia-inner small",
          (element) => element.textContent.trim()
        );
        const dni = small.split(" ")[2];
        const estadoRespuesta = await page.$eval("div.estado h4", (element) =>
          element.textContent.trim()
        );
        let estado;
        if (
          estadoRespuesta.startsWith(
            "Tu trámite fue resuelto en forma favorable"
          )
        ) {
          estado = "Favorable";
        } else if (
          estadoRespuesta.startsWith(
            "Tu trámite fue resuelto en forma desfavorable"
          )
        ) {
          estado = "Desfavorable";
        } else if (
          estadoRespuesta.startsWith("Tu trámite se encontraba mal caratulado")
        ) {
          estado = "Cambio de carátula";
        } else if (estadoRespuesta.startsWith("Es necesario que aportes documentación")){
          estado = "Iniciado / Requiere documentación"
        }
         else {
          estado = "Iniciado";
        }

        if (objeto[dni]) {
          objeto[dni] = { ...objeto[dni], [codigo]: estado };
        } else {
          objeto[dni] = { [codigo]: estado };
        }
      } catch (error) {
        console.error(` este Expediente no tiene tramite iniciado ${codigo} `);
      }
    }
    await fs.writeFile("resultados.json", JSON.stringify(objeto, null));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
