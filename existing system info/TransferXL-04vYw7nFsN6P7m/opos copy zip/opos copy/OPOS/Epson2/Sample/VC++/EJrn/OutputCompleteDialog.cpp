// OutputCompleteDialog.cpp : implementation file
//

#include "stdafx.h"
#include "electronicjournal.h"
#include "OutputCompleteDialog.h"

#ifdef _DEBUG
#define new DEBUG_NEW
#undef THIS_FILE
static char THIS_FILE[] = __FILE__;
#endif

/////////////////////////////////////////////////////////////////////////////
// COutputCompleteDialog dialog


COutputCompleteDialog::COutputCompleteDialog(CWnd* pParent /*=NULL*/)
	: CDialog(COutputCompleteDialog::IDD, pParent)
{
	//{{AFX_DATA_INIT(COutputCompleteDialog)
		// NOTE - the ClassWizard will add and remove mapping macros here.
		//    DO NOT EDIT what you see in these blocks of generated code!
	//}}AFX_DATA_INIT

	m_pParent = pParent;
	m_nID = COutputCompleteDialog::IDD;
}


void COutputCompleteDialog::DoDataExchange(CDataExchange* pDX)
{
	CDialog::DoDataExchange(pDX);
	//{{AFX_DATA_MAP(COutputCompleteDialog)
	//}}AFX_DATA_MAP
}


BEGIN_MESSAGE_MAP(COutputCompleteDialog, CDialog)
	//{{AFX_MSG_MAP(COutputCompleteDialog)
	//}}AFX_MSG_MAP
END_MESSAGE_MAP()

/////////////////////////////////////////////////////////////////////////////
// COutputCompleteDialog message handlers

BOOL COutputCompleteDialog::Create() 
{
	return CDialog::Create( m_nID, m_pParent);
}

void COutputCompleteDialog::OnOK() 
{
	DestroyWindow();
}

void COutputCompleteDialog::PostNcDestroy() 
{
	delete this;	
}

void COutputCompleteDialog::SetMessage(CString strMsg)
{
	GetDlgItem(IDC_MESSAGE)->SetWindowText(strMsg);
}

