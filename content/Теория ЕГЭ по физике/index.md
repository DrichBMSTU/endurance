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
---
[[Codificator.pdf|Кодификатор (версия для мобильных устройств)]]

---

![[Codificator.pdf]]

---

<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Пример отображения PDF с помощью PDF.js</title>
    <style>
        body {
            font-family: Arial, sans-serif;
        }
        #pdf-viewer {
            width: 100%;
            height: 600px;
            border: 1px solid #ccc;
            margin-bottom: 1rem;
        }
    </style>
</head>
<body>
    <h1>Просмотр PDF файла</h1>
    <div id="pdf-viewer"></div>
    
    <!-- Подключаем библиотеку PDF.js -->
    <script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@latest/build/pdf.min.js"></script>

    <!-- Наш скрипт для отображения PDF -->
    <script>
        const pdfUrl = '/adds/adds_pdf/Codificator.pdf'; // Путь к вашему PDF файлу
        const container = document.getElementById('pdf-viewer');

        async function loadPdf() {
            try {
                const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
                const doc = await loadingTask.promise;
                
                // Показываем первую страницу
                displayPage(doc, 1);
            } catch (err) {
                console.error(err.message || err);
            }
        };

        function displayPage(doc, num) {
            doc.getPage(num).then((page) => {
                let viewport = page.getViewport({ scale: 1 });
                let canvas = document.createElement("canvas");
                canvas.style.display = 'block';
                container.innerHTML = '';
                container.appendChild(canvas);
                let ctx = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                page.render({
                    canvasContext: ctx,
                    viewport: viewport
                }).promise.then(() => {
                    console.log(`Отображена страница №${num}`);
                });
            });
        }

        window.onload = () => {
            loadPdf(); // Загружаем PDF при загрузке страницы
        };
    </script>
</body>
</html>