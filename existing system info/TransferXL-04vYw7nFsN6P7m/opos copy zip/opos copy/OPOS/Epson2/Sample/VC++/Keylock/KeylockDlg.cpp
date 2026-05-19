// KeylockDlg.cpp : implementation file
//

#include "stdafx.h"
#include "Keylock.h"
#include "KeylockDlg.h"
#include "OPOSlock.h"
#include "XMLView.h"

#ifdef _DEBUG
#define new DEBUG_NEW
#undef THIS_FILE
static char THIS_FILE[] = __FILE__;
#endif

/////////////////////////////////////////////////////////////////////////////
// CKeylockDlg dialog

CKeylockDlg::CKeylockDlg(CWnd* pParent /*=NULL*/)
	: CDialog(CKeylockDlg::IDD, pParent)
{
	//{{AFX_DATA_INIT(CKeylockDlg)
	//}}AFX_DATA_INIT
	m_hIcon = AfxGetApp()->LoadIcon(IDR_MAINFRAME);
}

void CKeylockDlg::DoDataExchange(CDataExchange* pDX)
{
	CDialog::DoDataExchange(pDX);
	//{{AFX_DATA_MAP(CKeylockDlg)
	DDX_Control(pDX, IDC_EDIT_RETRIEVST, m_edtRetrieveSt);
	DDX_Control(pDX, IDC_KEYLOCK1, m_Lock1);
	//}}AFX_DATA_MAP
}

BEGIN_MESSAGE_MAP(CKeylockDlg, CDialog)
	//{{AFX_MSG_MAP(CKeylockDlg)
	ON_WM_PAINT()
	ON_WM_QUERYDRAGICON()
	ON_WM_CLOSE()
	ON_BN_CLICKED(IDC_BTN_KEYPOSI, OnBtnKeyposi)
	ON_BN_CLICKED(IDC_BTN_RETRIEVST, OnBtnRetrievSt)
	//}}AFX_MSG_MAP
END_MESSAGE_MAP()

/////////////////////////////////////////////////////////////////////////////
// CKeylockDlg message handlers

BOOL CKeylockDlg::OnInitDialog()
{
	CDialog::OnInitDialog();

	SetIcon(m_hIcon, TRUE);			// Set big icon
	SetIcon(m_hIcon, FALSE);		// Set small icon
	
	// TODO: Add extra initialization here
	BOOL bError = FALSE;
	while( 1 ) {
		//Open the device
		//Use a Logical Device Name which has been set on the SetupPOS.
		m_Lock1.Open("Unit1");
		//Check whether the device is succeed to open, or not
		if( m_Lock1.GetResultCode() != OPOS_SUCCESS ) {
			MessageBox("This device has not been registered, or cannot use.");
			bError = TRUE;
			break;
		}

        //Enable the device.
		m_Lock1.SetDeviceEnabled( TRUE );
		//Check whether the device is enable to use, or not
		if( m_Lock1.GetResultCode() != OPOS_SUCCESS ) {
			MessageBox("Now the device is disable to use.");
			bError = TRUE;
			break;
		}

		// Set the edit box of parameter input.
		CString	strParam = _T("ModelName,HoursPoweredCount,LockPositionChangeCount");
		m_edtRetrieveSt.SetWindowText( strParam );

		// Checks whether it has function to obtain 
		// the statistics of devices.
		// If it does not have the function, invalidates
		// the [Retrieve Statistics] button and the edit box
		// of parameter input.
		if( !m_Lock1.GetCapStatisticsReporting() )
		{	// CapStatisticsReporting = FALSE
			// 
			GetDlgItem(IDC_EDIT_RETRIEVST)->EnableWindow(FALSE);
			GetDlgItem(IDC_BTN_RETRIEVST)->EnableWindow(FALSE);
			GetDlgItem(IDC_STC_DST)->EnableWindow(FALSE);
		}

		break;
	}

	if( bError ) {
		//Disable all buttons
		GetDlgItem(IDC_BTN_KEYPOSI)->EnableWindow(FALSE);
		GetDlgItem(IDC_EDIT_RETRIEVST)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_RETRIEVST)->EnableWindow(FALSE);
		GetDlgItem(IDC_STC_DST)->EnableWindow(FALSE);
		GetDlgItem(IDC_STC_CHGLOCK)->EnableWindow(FALSE);
		GetDlgItem(IDC_STC_KEYPOS)->EnableWindow(FALSE);
	}

	return TRUE;  // return TRUE  unless you set the focus to a control
}

// If you add a minimize button to your dialog, you will need the code below
//  to draw the icon.  For MFC applications using the document/view model,
//  this is automatically done for you by the framework.

void CKeylockDlg::OnPaint() 
{
	if (IsIconic())
	{
		CPaintDC dc(this); // device context for painting

		SendMessage(WM_ICONERASEBKGND, (WPARAM) dc.GetSafeHdc(), 0);

		// Center icon in client rectangle
		int cxIcon = GetSystemMetrics(SM_CXICON);
		int cyIcon = GetSystemMetrics(SM_CYICON);
		CRect rect;
		GetClientRect(&rect);
		int x = (rect.Width() - cxIcon + 1) / 2;
		int y = (rect.Height() - cyIcon + 1) / 2;

		// Draw the icon
		dc.DrawIcon(x, y, m_hIcon);
	}
	else
	{
		CDialog::OnPaint();
	}
}

HCURSOR CKeylockDlg::OnQueryDragIcon()
{
	return (HCURSOR) m_hIcon;
}

void CKeylockDlg::OnClose() 
{
	//Cancel the device
	m_Lock1.SetDeviceEnabled( FALSE );

	//Finish using the device.
	m_Lock1.Close();

	CDialog::OnClose();
}

////////////////////////////////////////////////////////////////////////////////
//	
//
void CKeylockDlg::OnBtnKeyposi() 
{
	BOOL bExit = FALSE;
	int iRet;

	MessageBox("After pressing OK button, wait for 5 seconds till the keylock position is changed.");

	SetCursor( LoadCursor( NULL, IDC_WAIT ));
	GetDlgItem(IDC_BTN_KEYPOSI)->EnableWindow(FALSE);

	while( !bExit ) {
		m_Lock1.WaitForKeylockChange( LOCK_KP_ANY, 5000 );
		switch( m_Lock1.GetResultCode()) {
		case OPOS_SUCCESS:
			// The position of the keylock has been changed in time.
			bExit = TRUE;
			break;
		case OPOS_E_TIMEOUT:
			iRet = MessageBox("The keylock position has not been changed in time. Retry?", "timeout", MB_YESNO + MB_ICONQUESTION);
			if( iRet == IDNO ) {
				// Because NO is selected, break out of the loop
				bExit = TRUE;
			}
			break;
		default:
			MessageBox("Other error");
			bExit = TRUE;
		}
	}

	GetDlgItem(IDC_BTN_KEYPOSI)->EnableWindow(TRUE);
	SetCursor( LoadCursor( NULL, IDC_ARROW ));
}

////////////////////////////////////////////////////////////////////////////////
//	Events
//
BEGIN_EVENTSINK_MAP(CKeylockDlg, CDialog)
    //{{AFX_EVENTSINK_MAP(CKeylockDlg)
	ON_EVENT(CKeylockDlg, IDC_KEYLOCK1, 5 /* StatusUpdateEvent */, OnStatusUpdateEventKeylock1, VTS_I4)
	//}}AFX_EVENTSINK_MAP
END_EVENTSINK_MAP()

////////////////////////////////////////////////////////////////////////////////
//	StatusUpdateEvent
//
void CKeylockDlg::OnStatusUpdateEventKeylock1(long Data) 
{
	CString sPosition;

	switch( m_Lock1.GetKeyPosition()) {
	case LOCK_KP_LOCK:
		sPosition = "Lock";
		break;
	case LOCK_KP_NORM:
		sPosition = "Normal";
		break;
	case LOCK_KP_SUPR:
		sPosition = "Supervisor";
		break;
	default:
		sPosition.Format("Else(%d)", m_Lock1.GetKeyPosition());
	}
	GetDlgItem(IDC_EDIT_POSITION)->SetWindowText( sPosition );
}

void CKeylockDlg::OnBtnRetrievSt() 
{
	CString	strParam;
	CString	strErrMsg;
	CString	strXMLPath;
	BSTR	bstrParam;

    m_edtRetrieveSt.GetWindowText(strParam);
    strErrMsg.Empty();
	bstrParam = strParam.AllocSysString();

    // Obtains the statistics of the device and stores it in a file.
	m_Lock1.RetrieveStatistics( &bstrParam );
	if( m_Lock1.GetResultCode() != OPOS_SUCCESS )
	{
		CString	strTemp;
		strErrMsg  = _T("RetrieveStatistics method error.\n\n");
		strTemp.Format("%d", m_Lock1.GetResultCode() );
		strErrMsg += _T("ResultCode = ") + strTemp + _T("\n");
		strTemp.Format("%d", m_Lock1.GetResultCodeExtended() );
		strErrMsg += _T("ResultCodeExtended = ") + strTemp;
		MessageBox( strErrMsg );
		return;
	}
    
	strXMLPath = _T("Sample.xml");
	strParam = bstrParam;
	::SysFreeString( bstrParam );

	CFile cfXMLFile( strXMLPath, CFile::modeCreate | CFile::modeWrite );
	strXMLPath = cfXMLFile.GetFilePath();
	cfXMLFile.Write( strParam, strParam.GetLength() );
	cfXMLFile.Close();

	// Opens another window and indicates the information of the XML file.
	CXMLView cxmlDlg;
	cxmlDlg.SetXMLFilePath( strXMLPath );
    cxmlDlg.DoModal();
}

