import os
from pathlib import Path
from typing import Optional, List

def resolve_import_path(import_statement: str, current_file_path: Path, repo_root: Path) -> Optional[str]:
    """
    Resolve an import statement to an actual file path
    
    Args:
        import_statement: The import statement (e.g., "from .models import User" or "import utils.helper")
        current_file_path: Path of the file containing the import
        repo_root: Root of the repository
        
    Returns:
        Absolute path to the imported file or None if not found
    """
    try:
        # Handle relative imports (starting with . or ..)
        if import_statement.startswith('.'):
            return resolve_relative_import(import_statement, current_file_path, repo_root)
        
        # Handle absolute imports (e.g., "utils.helper")
        return resolve_absolute_import(import_statement, repo_root)
    except Exception:
        return None

def resolve_relative_import(import_statement: str, current_file_path: Path, repo_root: Path) -> Optional[str]:
    """
    Resolve relative import paths like .utils or ..models.user
    """
    # Count leading dots to determine depth
    dot_count = 0
    remaining = import_statement
    while remaining.startswith('.'):
        dot_count += 1
        remaining = remaining[1:]
    
    # Navigate up the directory structure based on dot count
    current_dir = current_file_path.parent
    for _ in range(dot_count - 1):
        current_dir = current_dir.parent
    
    # Convert the rest of the import to a path
    import_parts = remaining.split(' ')[0].split('.')  # Take only the module part
    if import_parts and import_parts[0]:  # Non-empty import
        # Try to find __init__.py or .py file
        path_base = current_dir.joinpath(*import_parts)
        
        # Check for exact file match
        if path_base.with_suffix('.py').exists():
            return str(path_base.with_suffix('.py'))
            
        # Check for directory with __init__.py
        if path_base.exists() and path_base.is_dir():
            init_file = path_base / '__init__.py'
            if init_file.exists():
                return str(init_file)
                
        # Check for module in directory
        if current_dir.exists():
            for item in current_dir.iterdir():
                if item.is_file() and item.stem == import_parts[0] and item.suffix == '.py':
                    return str(item)
                    
        return None
    else:
        # Importing from current directory (__init__.py)
        init_file = current_dir / '__init__.py'
        return str(init_file) if init_file.exists() else None

def resolve_absolute_import(import_statement: str, repo_root: Path) -> Optional[str]:
    """
    Resolve absolute import paths like "utils.helper" or "models.user"
    """
    # Split the import into parts
    import_parts = import_statement.split(' ')[0].split('.')
    
    # Start from repo root and follow the path
    current_path = repo_root
    for part in import_parts:
        if part in ['from', 'import']:
            continue
        found = False
        # Look for .py file or directory with __init__.py
        py_file = current_path / f"{part}.py"
        if py_file.exists():
            return str(py_file)
            
        dir_path = current_path / part
        if dir_path.exists() and dir_path.is_dir():
            init_file = dir_path / '__init__.py'
            if init_file.exists():
                current_path = dir_path
                found = True
            else:
                # Look for .py file with matching name
                py_file = dir_path.with_suffix('.py')
                if py_file.exists():
                    return str(py_file)
                else:
                    # Look inside directory for files
                    for item in dir_path.iterdir():
                        if item.is_file() and item.stem == part and item.suffix == '.py':
                            return str(item)
        
        if not found:
            break
            
    return None

def get_file_id(file_path: Path, repo_root: Path) -> str:
    """
    Generate a unique ID for a file based on its path relative to repo root
    """
    try:
        rel_path = file_path.relative_to(repo_root)
        return str(rel_path).replace('\\', '/')
    except ValueError:
        # If file_path is not under repo_root, use full path
        return str(file_path).replace('\\', '/')

def find_files_by_name(repo_root: Path, file_name: str) -> List[Path]:
    """
    Find all files with a specific name in the repository
    """
    found_files = []
    for root, dirs, files in os.walk(repo_root):
        # Skip hidden directories and node_modules
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != 'node_modules' and d != '__pycache__']
        
        if file_name in files:
            found_files.append(Path(root) / file_name)
            
    return found_files