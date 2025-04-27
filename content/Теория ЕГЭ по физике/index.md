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

---
[[Codificator.pdf|Кодификатор (версия для мобильных устройств)]]

---

![[Codificator.pdf]]

---

<div id="pdf-container" style="width: 100%; height: 600px;"></div>

<script src="//mozilla.github.io/pdf.js/build/pdf.js"></script>
<script>
  const container = document.getElementById('pdf-container');
  const pdfUrl = 'https://drichbmstu.github.io/endurance/adds/adds_pdf/Codificator.pdf'
  
  pdfjsLib.getDocument(pdfUrl).promise.then(pdf => {
    pdf.getPage(1).then(page => {
      const viewport = page.getViewport({ scale: 1 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      container.appendChild(canvas);
      
      page.render({
        canvasContext: context,
        viewport: viewport
      });
    });
  });
</script>
