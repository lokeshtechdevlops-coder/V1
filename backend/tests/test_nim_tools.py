from langchain_core.messages import AIMessage
from app.core.config import get_settings
from app.agents import orchestrator


def test_nim_unavailable_fails_closed_without_exposing_provider_details(clients,db_factory,monkeypatch):
    from sqlalchemy import func,select
    from app.models import Appointment,PendingAction,AgentRun
    class UnavailableNIM:
        def invoke(self,messages):
            raise TimeoutError('private-provider-detail-do-not-expose')
    monkeypatch.setattr(get_settings(),'ai_mode','nim')
    monkeypatch.setattr(orchestrator,'nim_client',lambda:UnavailableNIM())
    with db_factory() as db:
        before=db.scalar(select(func.count()).select_from(Appointment))
    response=clients['patient'].post('/api/chat',json={'message':'Book a consultation'})
    assert response.status_code==200
    assert 'unavailable' in response.json()['answer']
    assert response.json()['actions']==[]
    assert 'private-provider-detail' not in response.text
    with db_factory() as db:
        assert db.scalar(select(func.count()).select_from(Appointment))==before
        assert db.scalar(select(func.count()).select_from(PendingAction))==0
        assert db.scalar(select(AgentRun.status))=='failed'


def test_nim_tool_loop_uses_restricted_tools(clients, monkeypatch):
    class FakeNIM:
        def bind_tools(self, tools):
            assert 'get_reports' in {tool.name for tool in tools}
            self.calls=0
            return self
        def invoke(self,messages):
            if len(messages)==2 and 'Route the request' in messages[0].content:
                return AIMessage(content='report')
            self.calls+=1
            if self.calls==1:
                return AIMessage(content='',tool_calls=[{'name':'get_reports','args':{'patient_id':'pt-priya'},'id':'call1','type':'tool_call'}])
            assert messages[-1].content=='Access to this resource is not permitted.'
            return AIMessage(content='Access to this resource is not permitted.')
    monkeypatch.setattr(get_settings(),'ai_mode','nim')
    monkeypatch.setattr(orchestrator,'nim_client',lambda:FakeNIM())
    response=clients['patient'].post('/api/chat',json={'message':'Show reports'})
    assert response.status_code==200,response.text
    assert 'PRIVATE-PRIYA' not in response.text
    assert response.json()['answer']=='Access to this resource is not permitted.'


def test_nim_booking_proposal_survives_history_reload(clients, db_factory, monkeypatch):
    from sqlalchemy import select
    from app.models import Appointment
    class FakeNIM:
        def bind_tools(self,tools):
            self.calls=0
            return self
        def invoke(self,messages):
            if len(messages)==2 and 'Route the request' in messages[0].content:
                return AIMessage(content='appointment')
            self.calls+=1
            if self.calls==1:
                return AIMessage(content='',tool_calls=[{'name':'propose_booking','args':{'slot_id':'dr-sarah-0-1'},'id':'book1','type':'tool_call'}])
            return AIMessage(content='Review the booking proposal and confirm to execute it.')
    monkeypatch.setattr(get_settings(),'ai_mode','nim')
    monkeypatch.setattr(orchestrator,'nim_client',lambda:FakeNIM())
    response=clients['patient'].post('/api/chat',json={'message':'Book a consultation'})
    assert response.status_code==200,response.text
    result=response.json()
    assert result['actions'][0]['status']=='pending'
    with db_factory() as db:
        assert not db.scalar(select(Appointment).where(Appointment.reservation_slot_id=='dr-sarah-0-1'))
    history=clients['patient'].get(f"/api/conversations/{result['conversation_id']}/messages").json()
    pending=next(m for m in history if m['role']=='assistant')['actions'][0]
    assert pending['id']==result['actions'][0]['id']
    assert clients['patient'].post(f"/api/actions/{pending['id']}/confirm").status_code==200
    history=clients['patient'].get(f"/api/conversations/{result['conversation_id']}/messages").json()
    assert next(m for m in history if m['role']=='assistant')['actions'][0]['status']=='executed'
