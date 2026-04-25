import os
from pathlib import Path
from typing import Optional

def detect_language_from_extension(file_path: Path) -> str:
    """
    Detect programming language from file extension
    
    Args:
        file_path: Path to the file
        
    Returns:
        Language name as string (e.g., 'python', 'javascript')
    """
    extensions = {
        '.py': 'python',
        '.js': 'javascript',
        '.ts': 'typescript',
        '.jsx': 'javascript',
        '.tsx': 'typescript',
        '.java': 'java',
        '.cpp': 'cpp',
        '.cxx': 'cpp',
        '.cc': 'cpp',
        '.c': 'c',
        '.cs': 'csharp',
        '.go': 'go',
        '.rs': 'rust',
        '.swift': 'swift',
        '.kt': 'kotlin',
        '.kts': 'kotlin',
        '.php': 'php',
        '.rb': 'ruby',
        '.scala': 'scala',
        '.sc': 'scala',
        '.sql': 'sql',
        '.sh': 'shell',
        '.bash': 'shell',
        '.html': 'html',
        '.htm': 'html',
        '.xml': 'xml',
        '.css': 'css',
        '.scss': 'scss',
        '.sass': 'scss',
        '.less': 'less',
        '.json': 'json',
        '.yaml': 'yaml',
        '.yml': 'yaml',
        '.md': 'markdown',
        '.markdown': 'markdown'
    }
    
    return extensions.get(file_path.suffix.lower(), 'unknown')

def detect_language_from_content(file_content: str, file_path: Path) -> str:
    """
    Detect programming language from file content and path
    
    Args:
        file_content: Content of the file as string
        file_path: Path to the file
        
    Returns:
        Language name as string
    """
    # First try to detect from extension
    lang = detect_language_from_extension(file_path)
    if lang != 'unknown':
        return lang
    
    # If extension detection fails, try content-based detection
    # Check for language-specific patterns
    lines = file_content.split('\n')[:50]  # Check first 50 lines
    
    # Python indicators
    python_indicators = ['import ', 'from ', 'def ', 'class ', '__init__', 'if __name__']
    if any(indicator in line for line in lines for indicator in python_indicators):
        return 'python'
    
    # JavaScript/TypeScript indicators
    js_indicators = ['function ', 'const ', 'let ', 'var ', 'import ', 'export ', '=>', 'console.log']
    if any(indicator in line for line in lines for indicator in js_indicators):
        return 'javascript' if '.js' in file_path.suffix else 'typescript'
    
    # Java indicators
    java_indicators = ['public class', 'private ', 'protected ', 'import java.', 'package ']
    if any(indicator in line for line in lines for indicator in java_indicators):
        return 'java'
    
    # C/C++ indicators
    c_indicators = ['#include', '#define', 'int main(', 'printf', 'std::']
    if any(indicator in line for line in lines for indicator in c_indicators):
        return 'c' if '.c' in file_path.suffix else 'cpp'
    
    # Go indicators
    go_indicators = ['package ', 'func ', 'import (', 'fmt.', 'goroutine']
    if any(indicator in line for line in lines for indicator in go_indicators):
        return 'go'
    
    return 'unknown'

def detect_language(file_path: Path, file_content: Optional[str] = None) -> str:
    """
    Detect programming language from file path and optionally content
    
    Args:
        file_path: Path to the file
        file_content: Optional content of the file (if None, will read the file)
        
    Returns:
        Language name as string
    """
    # If content wasn't provided, read it safely
    if file_content is None:
        try:
            from .file_reader import read_file_safe
            file_content = read_file_safe(file_path) or ""
        except ImportError:
            # Fallback if import fails
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    file_content = f.read()
            except:
                file_content = ""
    
    # First try extension-based detection
    lang = detect_language_from_extension(file_path)
    if lang != 'unknown':
        return lang
    
    # If that fails, use content-based detection
    return detect_language_from_content(file_content, file_path)