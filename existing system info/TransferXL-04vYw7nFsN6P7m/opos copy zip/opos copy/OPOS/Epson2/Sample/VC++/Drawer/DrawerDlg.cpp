// DrawerDlg.cpp : implementation file
//

#include "stdafx.h"
#include "Drawer.h"
#include "DrawerDlg.h"
#include "OPOS.h"
#include "OPOSCash.h"
#include "OPOSPtr.h"
#include "XMLView.h"

#ifdef _DEBUG
#define new DEBUG_NEW
#undef THIS_FILE
static char THIS_FILE[] = __FILE__;
#endif

/////////////////////////////////////////////////////////////////////////////
// CDrawerDlg dialog

CDrawerDlg::CDrawerDlg(CWnd* pParent /*=NULL*/)
	: CDialog(CDrawerDlg::IDD, pParent)
{
	//{{AFX_DATA_INIT(CDrawerDlg)
	//}}AFX_DATA_INIT
	m_hIcon = AfxGetApp()->LoadIcon(IDR_MAINFRAME);
}

void CDrawerDlg::DoDataExchange(CDataExchange* pDX)
{
	CDialog::DoDataExchange(pDX);
	//{{AFX_DATA_MAP(CDrawerDlg)
	DDX_Control(pDX, IDC_EDIT_RETRIEVST, m_edtRetrieveSt);
	DDX_Control(pDX, IDC_CASHDRAWER1, m_Cash1);
	//}}AFX_DATA_MAP
}

BEGIN_MESSAGE_MAP(CDrawerDlg, CDialog)
	//{{AFX_MSG_MAP(CDrawerDlg)
	ON_WM_PAINT()
	ON_WM_QUERYDRAGICON()
	ON_WM_CLOSE()
	ON_BN_CLICKED(IDC_BTN_OPEN, OnBtnOpen)
	ON_BN_CLICKED(IDC_BTN_RETRIEVST, OnBtnRetrievSt)
	//}}AFX_MSG_MAP
END_MESSAGE_MAP()

/////////////////////////////////////////////////////////////////////////////
// CDrawerDlg message handlers

BOOL CDrawerDlg::OnInitDialog()
{
	CDialog::OnInitDialog();

	SetIcon(m_hIcon, TRUE);			// Set big icon
	SetIcon(m_hIcon, FALSE);		// Set small icon
	
	// TODO: Add extra initialization here
	BOOL bError = FALSE;
    while( 1 ) {
		// Open the device
		// Use a Logical Device Name which has been set on the SetupPOS.
		m_Cash1.Open("Unit1");
		// Check whether the device is succeed to open, or not
		if( m_Cash1.GetResultCode() != OPOS_SUCCESS ) {
			MessageBox("This device has not been registered, or cannot use.");
			bError = TRUE;
			break;
		}

		// Get the exclusive control right for the opened device.
		// Then the device is disable from other application.
		//(Notice:When using an old CO, use the Claim.)
		m_Cash1.ClaimDevice( 1000 );
        if( m_Cash1.GetResultCode() != OPOS_SUCCESS ) {
            MessageBox("Fails to get the exclusive right for the device.");
			bError = TRUE;
			break;
        }

        // If support the CapPowerReporting, enable the Power Reporting Requirements.
        if( m_Cash1.GetCapPowerReporting() != OPOS_PR_NONE )
            m_Cash1.SetPowerNotify( OPOS_PN_ENABLED );

		// Enable the device.
		m_Cash1.SetDeviceEnabled( TRUE );
		// Check whether the device is enable to use, or not
		if( m_Cash1.GetResultCode() != OPOS_SUCCESS ) {
			MessageBox("Now the device is disable to use.");
			bError = TRUE;
			break;
		}

        // Check whether enable to monitor the drawer open/close status, or not.
        if( m_Cash1.GetCapStatus()) {
            // Disable to monitor
			GetDlgItem(IDC_LBL_TSTATIC)->EnableWindow(FALSE);
			GetDlgItem(IDC_LBL_TPOWER)->EnableWindow(FALSE);
        }

		// Set the edit box of parameter input.
		CString	strParam = _T("ModelName,HoursPoweredCount,DrawerGoodOpenCount");
		m_edtRetrieveSt.SetWindowText( strParam );

		// Checks whether it has function to obtain 
		// the statistics of devices.
		// If it does not have the function, invalidates
		// the [Retrieve Statistics] button and the edit box
		// of parameter input. 
		if( !m_Cash1.GetCapStatisticsReporting() )
		{	// CapStatisticsReporting = FALSE
			GetDlgItem(IDC_EDIT_RETRIEVST)->EnableWindow(FALSE);
			GetDlgItem(IDC_BTN_RETRIEVST)->EnableWindow(FALSE);
			GetDlgItem(IDC_STC_DST)->EnableWindow(FALSE);
		}

		break;
	}

	if( bError ) {
		// Disable all buttons
		GetDlgItem(IDC_BTN_OPEN)->EnableWindow(FALSE);
		GetDlgItem(IDC_LBL_TSTATIC)->EnableWindow(FALSE);
		GetDlgItem(IDC_LBL_TPOWER)->EnableWindow(FALSE);
		GetDlgItem(IDC_EDIT_RETRIEVST)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_RETRIEVST)->EnableWindow(FALSE);
		GetDlgItem(IDC_STC_DST)->EnableWindow(FALSE);
	}
	
	return TRUE;  // return TRUE  unless you set the focus to a control
}

// If you add a minimize button to your dialog, you will need the code below
//  to draw the icon.  For MFC applications using the document/view model,
//  this is automatically done for you by the framework.

void CDrawerDlg::OnPaint() 
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

HCURSOR CDrawerDlg::OnQueryDragIcon()
{
	return (HCURSOR) m_hIcon;
}

void CDrawerDlg::OnClose() 
{
	// Cancel the device
	m_Cash1.SetDeviceEnabled( FALSE );

	// Release the device exclusive control right.
	//(Notice:When using an old CO, use the Release.)
	m_Cash1.ReleaseDevice();

	// Finish using the device.
	m_Cash1.Close();

	CDialog::OnClose();
}

////////////////////////////////////////////////////////////////////////////////
//	Open a drawer
//
void CDrawerDlg::OnBtnOpen() 
{
	m_Cash1.OpenDrawer();
	switch ( m_Cash1.GetResultCodeExtended() ) {
	case OPOS_EPTR_COVER_OPEN:
		MessageBox ("OpenDrawer Error\nPrinter Cover Open");
		break;
	case OPOS_EPTR_JRN_EMPTY:
		MessageBox ("OpenDrawer Error\nPrinter Journal Empty");
		break;
	case OPOS_EPTR_REC_EMPTY:
		MessageBox ("OpenDrawer Error\nPrinter Receipt Empty");
		break;
	default:
		if (m_Cash1.GetResultCode() != OPOS_SUCCESS) {
			MessageBox ("OpenDrawer Error");
		}
	}
}

////////////////////////////////////////////////////////////////////////////////
//	Events
//
BEGIN_EVENTSINK_MAP(CDrawerDlg, CDialog)
    //{{AFX_EVENTSINK_MAP(CDrawerDlg)
	ON_EVENT(CDrawerDlg, IDC_CASHDRAWER1, 5 /* StatusUpdateEvent */, OnStatusUpdateEventCashdrawer1, VTS_I4)
	//}}AFX_EVENTSINK_MAP
END_EVENTSINK_MAP()

////////////////////////////////////////////////////////////////////////////////
//	StatusUpdateEvent
//
void CDrawerDlg::OnStatusUpdateEventCashdrawer1(long Data) 
{
	switch( Data ) {
	case CASH_SUE_DRAWERCLOSED:			// Drawer is closed
        GetDlgItem(IDC_LBL_STATUS)->SetWindowText("Close");
		break;
	case CASH_SUE_DRAWEROPEN:			// Drawer is opened
        GetDlgItem(IDC_LBL_STATUS)->SetWindowText("Open");
		break;
    
// The Power Reporting Requirements fires the event when the device power status is changed.
	case OPOS_SUE_POWER_ONLINE:			// The device is powered on.
		GetDlgItem(IDC_LBL_POWER)->SetWindowText("ready");
		break;
	case OPOS_SUE_POWER_OFF:			// The device is powered off, or unconnected.
		GetDlgItem(IDC_LBL_POWER)->SetWindowText("OFF");
		break;
	case OPOS_SUE_POWER_OFFLINE:		// The device is powered on, but disable to operate.
		GetDlgItem(IDC_LBL_POWER)->SetWindowText("not ready");
		break;
	case OPOS_SUE_POWER_OFF_OFFLINE:	// The device is powered off or off-line.
		GetDlgItem(IDC_LBL_POWER)->SetWindowText("Offline");
		break;
	}
}

void CDrawerDlg::OnBtnRetrievSt() 
{
	CString	strParam;
	CString	strErrMsg;
	CString	strXMLPath;
	BSTR	bstrParam;

    m_edtRetrieveSt.GetWindowText(strParam);
    strErrMsg.Empty();
	bstrParam = strParam.AllocSysString();

    // Obtains the statistics of the device and stores it in a file.
	m_Cash1.RetrieveStatistics( &bstrParam );
	if( m_Cash1.GetResultCode() != OPOS_SUCCESS )
	{
		CString	strTemp;
		strErrMsg  = _T("RetrieveStatistics method error.\n\n");
		strTemp.Format("%d", m_Cash1.GetResultCode() );
		strErrMsg += _T("ResultCode = ") + strTemp + _T("\n");
		strTemp.Format("%d", m_Cash1.GetResultCodeExtended() );
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

