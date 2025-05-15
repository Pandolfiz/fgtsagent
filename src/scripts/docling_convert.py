import sys
from docling.document_converter import DocumentConverter

if __name__ == '__main__':
    file_path = sys.argv[1]
    converter = DocumentConverter()
    result = converter.convert(file_path)
    sys.stdout.reconfigure(encoding='utf-8')
    print(result.document.export_to_markdown()) 