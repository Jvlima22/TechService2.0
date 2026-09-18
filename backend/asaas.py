import os
import httpx
from core import now

ASAAS_API_KEY = os.environ.get('ASAAS_API_KEY', '')
ASAAS_URL = "https://sandbox.asaas.com/api/v3"

def get_asaas_headers():
    return {
        "access_token": ASAAS_API_KEY,
        "Content-Type": "application/json"
    }

async def create_customer(name: str, email: str = '', phone: str = '', document: str = ''):
    async with httpx.AsyncClient() as client:
        payload = {"name": name}
        if email: payload["email"] = email
        if phone: payload["phone"] = phone
        if document: payload["cpfCnpj"] = document
        
        res = await client.post(
            f"{ASAAS_URL}/customers",
            headers=get_asaas_headers(),
            json=payload
        )
        
        if res.status_code >= 400:
            print("Asaas Customer Error:", res.text)
        res.raise_for_status()
        return res.json()

async def create_checkout(customer_id: str, value: float, order_id: str, description: str):
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{ASAAS_URL}/payments",
            headers=get_asaas_headers(),
            json={
                "customer": customer_id,
                "billingType": "UNDEFINED", # Permite que o cliente escolha Pix ou Cartão no Checkout
                "value": value,
                "dueDate": now()[:10], 
                "description": description,
                "externalReference": f"TS_ORDER_{order_id}",
            }
        )
        if res.status_code >= 400:
            print("Asaas Payment Error:", res.text)
        res.raise_for_status()
        return res.json()
