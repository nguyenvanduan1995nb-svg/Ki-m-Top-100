document.addEventListener('DOMContentLoaded', () => {
    const productCodeInput = document.getElementById('productCodeInput');
    const productNameInput = document.getElementById('productNameInput');
    const addButton = document.getElementById('addButton');
    const excelFile = document.getElementById('excelFile');
    const barcodeContainer = document.getElementById('barcodeContainer');
    const exportPdfButton = document.getElementById('exportPdfButton');

    const modal = document.getElementById('zoomModal');
    const closeButton = document.querySelector('.close-button');
    const zoomedBarcode = document.getElementById('zoomedBarcode');
    const zoomedProductName = document.getElementById('zoomedProductName');

    // Hàm tạo mã vạch và thêm vào container
    const createBarcode = (code, name) => {
        // *** SỬA LỖI: Chuyển mã sang chữ IN HOA để tương thích với Code39 ***
        const upperCaseCode = String(code).toUpperCase();
        if (!upperCaseCode) return; // Bỏ qua nếu mã rỗng

        const item = document.createElement('div');
        item.className = 'barcode-item';
        // Lưu trữ dữ liệu đã được chuẩn hóa
        item.dataset.code = upperCaseCode;
        item.dataset.name = name;

        const nameElement = document.createElement('p');
        nameElement.className = 'product-name';
        nameElement.textContent = name || 'N/A';

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        
        const codeElement = document.createElement('p');
        codeElement.className = 'product-code';
        codeElement.textContent = upperCaseCode; // Hiển thị mã đã được in hoa

        item.appendChild(nameElement);
        item.appendChild(svg);
        item.appendChild(codeElement);
        barcodeContainer.appendChild(item);

        try {
            // Sử dụng mã đã được in hoa để tạo barcode
            JsBarcode(svg, upperCaseCode, {
                format: "CODE39",
                lineColor: "#000",
                width: 2,
                height: 60,
                displayValue: false
            });
        } catch (e) {
            console.error(e);
            item.innerHTML = `<p class="product-name">${name}</p><p style="color:red;">Lỗi tạo mã vạch cho: ${upperCaseCode}</p>`;
        }
        
        item.addEventListener('click', () => {
             const itemCode = item.dataset.code;
             const itemName = item.dataset.name;
             
             zoomedProductName.textContent = itemName || '';
             JsBarcode(zoomedBarcode, itemCode, {
                format: "CODE39",
                lineColor: "#000",
                width: 3,
                height: 120,
                displayValue: true,
                fontSize: 20
            });
            modal.style.display = 'flex';
        });
    };

    // Sự kiện cho nút "Thêm" thủ công
    addButton.addEventListener('click', () => {
        const codeValue = productCodeInput.value.trim();
        const nameValue = productNameInput.value.trim();

        if (!codeValue) {
            alert('Vui lòng nhập Mã sản phẩm.');
            return;
        }

        createBarcode(codeValue, nameValue);
        productCodeInput.value = '';
        productNameInput.value = '';
    });
    
    productNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addButton.click();
        }
    });

    // Sự kiện khi chọn file Excel
    excelFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            json.forEach(row => {
                if(row && row[0]) { 
                    const code = String(row[0]);
                    const name = row[1] ? String(row[1]) : '';
                    createBarcode(code, name);
                }
            });
        };
        reader.readAsArrayBuffer(file);
        excelFile.value = '';
    });

    // Sự kiện đóng modal
    closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });

    // Sự kiện cho nút "Xuất PDF"
    exportPdfButton.addEventListener('click', () => {
        if (barcodeContainer.children.length === 0) {
            alert("Không có dữ liệu để xuất PDF.");
            return;
        }
        
        const { jsPDF } = window.jspdf;
        barcodeContainer.style.justifyContent = 'space-around';
        
        html2canvas(barcodeContainer, {
            scale: 2 
        }).then(canvas => {
            barcodeContainer.style.justifyContent = 'center';

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;
            
            const imgWidth = pdfWidth - 40;
            const imgHeight = imgWidth / ratio;
            
            let heightLeft = imgHeight;
            let position = 20;

            pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
            heightLeft -= (pdfHeight - 40);

            while (heightLeft > 0) {
                pdf.addPage();
                position = -heightLeft - 20;
                pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
                heightLeft -= (pdfHeight - 40);
            }
            
            pdf.save('danh-sach-san-pham.pdf');
        });
    });
});
