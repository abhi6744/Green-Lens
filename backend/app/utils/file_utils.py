import os
import aiofiles
from fastapi import UploadFile

async def save_upload_file_tmp(upload_file: UploadFile, dest_path: str) -> None:
    async with aiofiles.open(dest_path, 'wb') as out_file:
        while content := await upload_file.read(1024 * 1024):  # async read chunk
            await out_file.write(content)

def cleanup_file(path: str) -> None:
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception:
        pass
