from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from ..services.sanitize import MAX_LINKS, clean_text, contains_markup, count_links


class ContactCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    company: str | None = Field(default=None, max_length=120)
    message: str = Field(min_length=10, max_length=5000)

    # Anti-spam fields, sent by the frontend form:
    # `website` is a hidden "honeypot" input real visitors never fill in,
    # `elapsed_ms` is how long the form was open before submitting.
    website: str | None = Field(default=None, max_length=200)
    elapsed_ms: int | None = Field(default=None, ge=0, le=86_400_000)

    @field_validator("name", "company")
    @classmethod
    def clean_single_line(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = clean_text(value)
        if contains_markup(value) or count_links(value):
            raise ValueError("Please use plain text without links or HTML.")
        return value or None

    @field_validator("message")
    @classmethod
    def clean_message(cls, value: str) -> str:
        value = clean_text(value, multiline=True)
        if len(value) < 10:
            raise ValueError("Message should be at least 10 characters.")
        if contains_markup(value):
            raise ValueError("Please send plain text without HTML.")
        if count_links(value) > MAX_LINKS:
            raise ValueError(f"Please include no more than {MAX_LINKS} links.")
        return value


class ContactAccepted(BaseModel):
    ok: bool = True
    message: str = "Thanks! Your message has been received."


class ContactRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    company: str | None
    message: str
    email_sent: bool
    created_at: datetime
