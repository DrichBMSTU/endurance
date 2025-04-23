---
title: Теория ЕГЭ по физике
---
На этой странице собраны ссылки на **теоретические материалы**, разбитые на разделы по Кодификатору ЕГЭ ФИПИ.
# 1. Механика
## [[1.1 Кинематика]]
## [[1.2 Динамика]]
## [[1.3 Статика]]

---
# Актуальный Кодификатор ФИПИ по физике на 2024-2025
(открывается с ПК)


<iframe 
  src="Codificator.pdf" 
  style="width: 100%; height: 600px; border: none;"
  title="PDF Viewer"
>
  Ваш браузер не поддерживает PDF. 
  <a href="Codificator.pdf">Скачать PDF</a>
</iframe>

<div id="pdf-viewer"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script>
  const url = "Codificator.pdf";
  const container = document.getElementById("pdf-viewer");
  
  pdfjsLib.getDocument(url).promise.then(pdf => {
    for (let i = 1; i <= pdf.numPages; i++) {
      pdf.getPage(i).then(page => {
        const canvas = document.createElement("canvas");
        container.appendChild(canvas);
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        page.render({ canvasContext: canvas.getContext("2d"), viewport });
      });
    }
  });
</script>

---

<iframe src="https://mozilla.github.io/pdf.js/web/viewer.html?file=/content/adds/adds_pdf/Codificator.pdf" width="100%" height="500px" style="border: none;"> 
</iframe>


