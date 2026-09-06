import os
import zipfile

def pack_source():
    exclude_dirs = {'.git', 'node_modules', 'dist', '__pycache__', '.vite'}
    exclude_files = {'Grow-Prune-Web.zip', 'Grow-Prune-Source.zip'}

    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    source_zip = os.path.join(root_dir, 'Grow-Prune-Source.zip')

    if os.path.exists(source_zip):
        os.remove(source_zip)

    count = 0
    with zipfile.ZipFile(source_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(root_dir):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for f in files:
                if (
                    f in exclude_files
                    or f.endswith('.zip')
                    or f.startswith('.DS_Store')
                    or f.endswith('.swp')
                ):
                    continue
                full_path = os.path.join(root, f)
                rel_path = os.path.relpath(full_path, root_dir)
                zf.write(full_path, rel_path)
                count += 1

    size_kb = os.path.getsize(source_zip) / 1024
    print(f'Successfully packaged {count} files into {source_zip} ({size_kb:.1f} KB)')

if __name__ == '__main__':
    pack_source()
