const puppeteer = require("puppeteer");
const fs = require("fs/promises");

(async () => {
  let browser;
  try {
    // Iniciar el navegador
    browser = await puppeteer.launch({
      headless: false,
    });
    const page = await browser.newPage();

    // Leer la lista de códigos desde el archivo txt
    const codigos = await fs.readFile("expedientes.txt", "utf-8");
    const codigosArray = codigos.split("\n");

    // Iterar sobre los códigos
    for (const codigo of codigosArray) {
      console.log("Consultando expediente:", codigo);

      // Navegar a la página
      await page.goto(
        "https://www.anses.gob.ar/consultas/consulta-de-expediente"
      );

      // Esperar el selector, si no se encuentra, continuar con el siguiente expediente
      try {
        await page.waitForSelector("#edit-nro-expediente", { timeout: 5000 });
      } catch (error) {
        console.error(
          `El selector '#edit-nro-expediente' no se encontró en la página. Pasando al siguiente expediente.`
        );
        continue;
      }

      // Insertar el código en el campo de búsqueda y enviar la consulta
      await page.type("#edit-nro-expediente", codigo);
      await page.click("#edit-submit");

      try{
        const waitSelector = await page.waitForSelector("#edit-nro-expediente", { timeout: 5000 });
        console.log(waitSelector)
        const respuestaElement = await page.$('.constancia-inner');
        console.log('respuestaElement', respuestaElement)
        const respuesta = await respuestaElement.evaluate(element => element.textContent.trim());

      console.log(`codigo: ${codigo}, Respuesta: ${respuesta}`);
      }catch(error) {
        console.error(`este Expediente no tiene tramite iniciado ${codigo} `);
      }

    
    

      // Pausa opcional entre consultas para evitar bloqueos
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    // Cerrar el navegador al finalizar
    if (browser) {
      await browser.close();
    }
  }
})();

// este funciona
// const puppeteer = require("puppeteer");
// const fs = require("fs/promises");

// (async () => {
//   // const url = 'https://www.anses.gob.ar/consultas/consulta-de-expediente'
//   const browser = await puppeteer.launch({
//     headless: false,
//   });
//   const page = await browser.newPage();

//   const pagina = await page.goto(
//     "https://www.anses.gob.ar/consultas/consulta-de-expediente"
//   );
//   console.log(pagina);

//   await page.waitForSelector("#edit-nro-expediente");
//   await page.type('#edit-nro-expediente', "1233213214");

// const valorCampo = await page.$eval('#edit-nro-expediente', input => input.value);
// console.log('Valor del campo de entrada:', valorCampo);
// })();
