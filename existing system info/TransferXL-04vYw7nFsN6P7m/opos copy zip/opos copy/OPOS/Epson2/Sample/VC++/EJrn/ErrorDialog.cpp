// ErrorDialog.cpp : implementation file
//

#include "stdafx.h"
#include "ElectronicJournal.h"
#include "ErrorDialog.h"

#ifdef _DEBUG
#define new DEBUG_NEW
#undef THIS_FILE
static char THIS_FILE[] = __FILE__;
#endif

/////////////////////////////////////////////////////////////////////////////
// CErrorDialog dialog


CErrorDialog::CErrorDialog(CWnd* pParent /*=NULL*/)
	: CDialog(CErrorDialog::IDD, pParent)
{
	//{{AFX_DATA_INIT(CErrorDialog)
	//}}AFX_DATA_INIT

	m_lErrorRecovery = ER_CANCEL;

	m_bSuspendButtonEnabled = TRUE;
	m_bRetryButtonEnabled = TRUE;
	m_bCancelButtonEnabled = TRUE;

	m_strSuspendButtonCaption = "Suspend Process";
	m_strRetryButtonCaption = "Retry Process";
	m_strCancelButtonCaption = "Cancel Process";

}


void CErrorDialog::DoDataExchange(CDataExchange* pDX)
{
	CDialog::DoDataExchange(pDX);
	//{{AFX_DATA_MAP(CErrorDialog)
	//}}AFX_DATA_MAP
}


BEGIN_MESSAGE_MAP(CErrorDialog, CDialog)
	//{{AFX_MSG_MAP(CErrorDialog)
	ON_BN_CLICKED(IDC_BUTTON_ERROR_RETRY, OnButtonRetry)
	ON_BN_CLICKED(IDC_BUTTON_ERROR_SUSPEND, OnButtonSuspend)
	ON_BN_CLICKED(IDC_BUTTON_ERROR_CANCEL, OnButtonCancel)
	//}}AFX_MSG_MAP
END_MESSAGE_MAP()

/////////////////////////////////////////////////////////////////////////////
// CErrorDialog message handlers

void CErrorDialog::OnButtonRetry() 
{
	// TODO: Add your control notification handler code here
	m_lErrorRecovery = ER_RETRY;

	CDialog::OnOK();
}

void CErrorDialog::OnButtonSuspend() 
{
	// TODO: Add your control notification handler code here
	m_lErrorRecovery = ER_SUSPEND;

	CDialog::OnOK();
}

void CErrorDialog::OnButtonCancel() 
{
	// TODO: Add your control notification handler code here
	m_lErrorRecovery = ER_CANCEL;

	CDialog::OnOK();
}

int CErrorDialog::DoModal() 
{
	// TODO: Add your specialized code here and/or call the base class
	
	return CDialog::DoModal();
}

BOOL CErrorDialog::OnInitDialog() 
{
	CDialog::OnInitDialog();
	
	// TODO: Add extra initialization here

	GetDlgItem(IDC_LABEL_ERROR)->SetWindowText(m_strErrorMessage);

	GetDlgItem(IDC_BUTTON_ERROR_SUSPEND)->SetWindowText(m_strSuspendButtonCaption);
	GetDlgItem(IDC_BUTTON_ERROR_RETRY)->SetWindowText(m_strRetryButtonCaption);
	GetDlgItem(IDC_BUTTON_ERROR_CANCEL)->SetWindowText(m_strCancelButtonCaption);

	GetDlgItem(IDC_BUTTON_ERROR_SUSPEND)->EnableWindow(m_bSuspendButtonEnabled);
	GetDlgItem(IDC_BUTTON_ERROR_RETRY)->EnableWindow(m_bRetryButtonEnabled);
	GetDlgItem(IDC_BUTTON_ERROR_CANCEL)->EnableWindow(m_bCancelButtonEnabled);

	
	return TRUE;  // return TRUE unless you set the focus to a control
	              // EXCEPTION: OCX Property Pages should return FALSE
}
