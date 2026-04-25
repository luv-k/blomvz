import os
from pathlib import Path
from typing import Optional, Tuple

def read_file_safe(file_path: Path) -> Optional[str]:
    """
    Safely read a file with proper encoding detection and binary file filtering
    """
    try:
        # Check if file is likely binary
        if is_binary_file(file_path):
            return None
            
        # Try different encodings
        encodings = ['utf-8', 'utf-16', 'latin-1']
        
        for encoding in encodings:
            try:
                with open(file_path, 'r', encoding=encoding) as f:
                    return f.read()
            except UnicodeDecodeError:
                continue
                
        return None
    except Exception:
        return None

def is_binary_file(file_path: Path) -> bool:
    """
    Check if a file is binary by reading first 1024 bytes
    """
    try:
        with open(file_path, 'rb') as f:
            chunk = f.read(1024)
            if b'\x00' in chunk:  # Null bytes indicate binary
                return True
            # Check if most characters are printable ASCII
            text_chars = bytearray({7,8,9,10,12,13,27} | set(range(0x20, 0x100)) - {0x7f})
            return not all(c in text_chars or c < 128 and chr(c).isprintable() for c in chunk)
    except Exception:
        return True

