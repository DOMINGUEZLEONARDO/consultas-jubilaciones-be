const puppeteer = require("puppeteer");
const fs = require("fs/promises");
const Excel = require("excel4node");

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

    let objeto = {};
    try {
      const jsonData = await fs.readFile("resultados.json", "utf-8");
      objeto = JSON.parse(jsonData);
    } catch (error) {
      console.log(
        "No se encontraron datos previos en el archivo JSON. Se crearán nuevos datos."
      );
    }

    for (const codigo of codigosLimpios) {
      await page.goto(
        "https://www.anses.gob.ar/consultas/consulta-de-expediente"
      );

      const partes = codigo.split("-");
      const cuit = partes.slice(1, 4).join("-");

      try {
        await page.waitForSelector("#edit-nro-expediente", { timeout: 5000 });
      } catch (error) {
        console.error(
          `El selector '#edit-nro-expediente' no se encontró en la página. Pasando al siguiente expediente.`
        );
        continue;
      }

      await page.type("#edit-nro-expediente", codigo);
      await page.click("#edit-submit");

      await new Promise((resolve) => setTimeout(resolve, 5000));

      try {
        await page.waitForSelector("[class=container]", { timeout: 5000 });
        const small = await page.$eval(
          "div.constancia-inner small",
          (element) => element.textContent.trim()
        );

        const fechaAlta = await page.$eval("div.fechas h4", (element) =>
          element.textContent.trim()
        );

        const fechaUr = await page.$eval(
          ".col-sm-6:nth-of-type(2) h4",
          (element) => element.textContent
        );

        const nombreCompleto = await page.evaluate(() => {
          const h2Element = document.querySelector(".constancia-inner h2");
          const nombre = h2Element.childNodes[0].nodeValue.trim();
          return nombre;
        });

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
        } else if (
          estadoRespuesta.startsWith("Es necesario que aportes documentación")
        ) {
          estado = "Iniciado / Requiere documentación";
        } else {
          estado = "Iniciado";
        }

        if (objeto[dni]) {
          objeto[dni] = {
            ...objeto[dni],
            Expediente: codigo,
            nombre: nombreCompleto,
            cuit: cuit,
            Estado: estado,
            alta_Expediente: fechaAlta,
            ultima_Revisión: fechaUr,
          };
        } else {
          objeto[dni] = {
            Expediente: codigo,
            Nombre: nombreCompleto,
            cuit: cuit,
            Estado: estado,
            "Alta de Expediente": fechaAlta,
            "Ultima Revisión": fechaUr,
          };
        }
      } catch (error) {
        console.error(` este Expediente no tiene tramite iniciado ${codigo} `);
      }
    }
    await fs.writeFile("resultados.json", JSON.stringify(objeto, null, 2));
    const jsonData = await fs.readFile("resultados.json", "utf-8");
    const data = JSON.parse(jsonData);
    //crear libro excel
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet("Datos");

    const headers = Object.keys(objeto[Object.keys(objeto)[0]]);
    headers.forEach((header, index) => {
      worksheet.cell(1, index + 1).string(header);
    });

    Object.values(objeto).forEach((row, rowIndex) => {
      headers.forEach((header, colIndex) => {
        worksheet.cell(rowIndex + 2, colIndex + 1).string(String(row[header]));
      });
    });

    await workbook.write("datos.xlsx");
    console.log("Archivo Excel guardado correctamente.");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
