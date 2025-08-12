document.addEventListener('DOMContentLoaded', () => {
    const manualInput = document.getElementById('manualInput');
    const addButton = document.getElementById('addButton');
    const excelFile = document.getElementById('excelFile');
    const barcodeContainer = document.getElementById('barcodeContainer');
    const exportPdfButton = document.getElementById('exportPdfButton');

    const modal = document.getElementById('zoomModal');
    const closeButton = document.querySelector('.close-button');
    const zoomedBarcode = document.getElementById('zoomedBarcode');

    // Hàm tạo mã vạch và thêm vào container
    const createBarcode = (value) => {
        if (!value) return; // Bỏ qua nếu giá trị rỗng

        const item = document.createElement('div');
        item.className = 'barcode-item';

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = `barcode-${value}-${Date.now()}`;
        
        const text = document.createElement('p');
        text.textContent = value;

        item.appendChild(svg);
        item.appendChild(text);
        barcodeContainer.appendChild(item);

        try {
            JsBarcode(svg, value, {
                format: "CODE39",
                lineColor: "#000",
                width: 2,
                height: 80,
                displayValue: false
            });
        } catch (e) {
            console.error(e);
            item.innerHTML = `<p style="color:red;">Lỗi tạo mã vạch cho: ${value}</p>`;
        }
        
        // Thêm sự kiện click để phóng to
        item.addEventListener('click', () => {
             JsBarcode(zoomedBarcode, value, {
                format: "CODE39",
                lineColor: "#000",
                width: 4,
                height: 150,
                displayValue: true,
                fontSize: 24
            });
            modal.style.display = 'flex';
        });
    };

    // Sự kiện cho nút "Thêm" thủ công
    addButton.addEventListener('click', () => {
        const value = manualInput.value.trim();
        createBarcode(value);
        manualInput.value = '';
    });
    
    // Sự kiện khi nhấn Enter trong ô input
    manualInput.addEventListener('keypress', (e) => {
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
            
            // Chuyển sheet thành JSON, chỉ lấy cột đầu tiên
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            json.forEach(row => {
                if(row[0]) { // Đảm bảo ô đầu tiên của hàng có dữ liệu
                    createBarcode(String(row[0]));
                }
            });
        };
        reader.readAsArrayBuffer(file);
        excelFile.value = ''; // Reset input để có thể chọn lại cùng 1 file
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
            alert("Không có mã vạch nào để xuất PDF.");
            return;
        }
        
        const { jsPDF } = window.jspdf;
        html2canvas(barcodeContainer, {
            scale: 2 // Tăng chất lượng ảnh chụp
        }).then(canvas => {
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
            
            const imgWidth = pdfWidth - 40; // trừ lề
            const imgHeight = imgWidth / ratio;
            
            let heightLeft = imgHeight;
            let position = 20; // vị trí bắt đầu từ trên xuống

            pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
            heightLeft -= (pdfHeight - 40);

            while (heightLeft > 0) {
                pdf.addPage();
                position = -heightLeft - 20;
                pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
                heightLeft -= (pdfHeight - 40);
            }
            
            pdf.save('danh-sach-ma-vach.pdf');
        });
    });
});