from typing import Literal, Any
from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_validator

class Input(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True, allow_inf_nan=False)

class Register(Input):
    name: str = Field(min_length=2, max_length=80)
    company_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=64)
    niche: Literal['assistance','automotive','maintenance','beauty']

class Login(Input):
    email: EmailStr
    password: str
    company_code: str = ''

class ForgotPassword(Input):
    email: EmailStr

class ResetPassword(Input):
    token: str
    password: str = Field(min_length=8, max_length=64)

class ClientInput(Input):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr | Literal[''] = ''
    phone: str = Field(default='', max_length=20)
    document: str = Field(default='', max_length=30)
    notes: str = Field(default='', max_length=2000)
    whatsapp_consent: bool = False

class OrderInput(Input):
    client_id: str
    item: str = Field(min_length=2, max_length=150)
    problem: str = Field(min_length=3, max_length=5000)
    item_fields: dict[str, Any] = Field(default_factory=dict)
    custom_values: dict[str, Any] = Field(default_factory=dict)
    technician_id: str = ''
    priority: Literal['normal','high','urgent'] = 'normal'
    due_date: str = ''
    @field_validator('due_date')
    @classmethod
    def valid_date(cls, v):
        if v:
            from datetime import date
            date.fromisoformat(v)
        return v

class QuoteLine(Input):
    description: str = Field(min_length=2, max_length=200)
    quantity: float = Field(gt=0, le=10000)
    unit_price: float = Field(ge=0, le=10000000)

class QuoteInput(Input):
    diagnosis: str = Field(min_length=3, max_length=5000)
    quote: list[QuoteLine] = Field(min_length=1, max_length=50)

class Transition(Input):
    status: str
    reason: str = Field(default='', max_length=2000)

class Decision(Input):
    decision: Literal['approved','rejected']
    name: str = Field(min_length=2, max_length=100)
    reason: str = Field(default='', max_length=2000)

class Payment(Input):
    amount: float = Field(gt=0, le=100000000)
    method: Literal['pix','cash','card','transfer'] = 'pix'

class UserInput(Input):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=64)
    role: Literal['admin','technician'] = 'technician'

class CustomField(Input):
    name: str = Field(min_length=2, max_length=50)
    type: Literal['text','number','date','select']
    options: list[str] = Field(default_factory=list, max_length=20)

class CompanyInput(Input):
    name: str = Field(min_length=2, max_length=100)

class DocResponse(BaseModel):
    model_config = ConfigDict(extra='allow')
    id: str