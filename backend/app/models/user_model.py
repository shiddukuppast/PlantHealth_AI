from datetime import datetime
from typing import NotRequired, TypedDict

from bson import ObjectId


class UserDocument(TypedDict):
    _id: NotRequired[ObjectId]
    name: str
    email: str
    password_hash: str
    created_at: datetime
    updated_at: datetime

