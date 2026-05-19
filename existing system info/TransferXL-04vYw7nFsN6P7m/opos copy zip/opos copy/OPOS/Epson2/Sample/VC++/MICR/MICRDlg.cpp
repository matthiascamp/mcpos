// MICRDlg.cpp : implementation file
//

#include "stdafx.h"
#include "MICR.h"
#include "MICRDlg.h"
#include "XMLView.h"
#include "OposMicr.h"
#include "Oposptr.h"


#ifdef _DEBUG
#define new DEBUG_NEW
#undef THIS_FILE
static char THIS_FILE[] = __FILE__;
#endif

/////////////////////////////////////////////////////////////////////////////
// CMICRDlg dialog

CMICRDlg::CMICRDlg(CWnd* pParent /*=NULL*/)
	: CDialog(CMICRDlg::IDD, pParent)
{
	//{{AFX_DATA_INIT(CMICRDlg)
	//}}AFX_DATA_INIT
	m_hIcon = AfxGetApp()->LoadIcon(IDR_MAINFRAME);
}

void CMICRDlg::DoDataExchange(CDataExchange* pDX)
{
	CDialog::DoDataExchange(pDX);
	//{{AFX_DATA_MAP(CMICRDlg)
	DDX_Control(pDX, IDC_EDIT_RETRIEVST, m_edtRetrieveSt);
	DDX_Control(pDX, IDC_MICR1, m_Micr1);
	DDX_Control(pDX, IDC_POSPRINTER1, m_Ptr1);
	//}}AFX_DATA_MAP
}

BEGIN_MESSAGE_MAP(CMICRDlg, CDialog)
	//{{AFX_MSG_MAP(CMICRDlg)
	ON_WM_PAINT()
	ON_WM_QUERYDRAGICON()
	ON_WM_CLOSE()
	ON_BN_CLICKED(IDC_BTN_INSERT, OnBtnInsert)
	ON_BN_CLICKED(IDC_BTN_PRINT, OnBtnPrint)
	ON_BN_CLICKED(IDC_BTN_REMOVE, OnBtnRemove)
	ON_BN_CLICKED(IDC_BTN_RETRIEVST, OnBtnRetrievSt)
	//}}AFX_MSG_MAP
END_MESSAGE_MAP()

/////////////////////////////////////////////////////////////////////////////
// CMICRDlg message handlers

BOOL CMICRDlg::OnInitDialog()
{
	CDialog::OnInitDialog();

	SetIcon(m_hIcon, TRUE);			// Set big icon
	SetIcon(m_hIcon, FALSE);		// Set small icon

	// TODO: Add extra initialization here
	BOOL bError = FALSE;
	BOOL bPtrError = FALSE;

	while( 1 ) {
		//Open the device
		//Use a Logical Device Name which has been set on the SetupPOS.
		m_Micr1.Open("Unit1");
		//Check whether the device is succeed to open, or not
		if( m_Micr1.GetResultCode() != OPOS_SUCCESS ) {
			MessageBox("This device has not been registered, or cannot use.");
			bError = TRUE;
			break;
		}
        //Get the exclusive control right for the opened device.
        //Then the device is disable from other application.
        //(Notice:When using an old CO, use the Claim.)
		m_Micr1.ClaimDevice( 1000 );
        if( m_Micr1.GetResultCode() != OPOS_SUCCESS ) {
            MessageBox("Fails to get the exclusive right for the device.");
			bError = TRUE;
			break;
        }
		// If support the CapPowerReporting, enable the Power Reporting Requirements.
		if( m_Micr1.GetCapPowerReporting() != OPOS_PR_NONE )
			m_Micr1.SetPowerNotify( OPOS_PN_ENABLED );
        //Enable the device.
		m_Micr1.SetDeviceEnabled( TRUE );
		//Check whether the device is enable to use, or not
		if( m_Micr1.GetResultCode() != OPOS_SUCCESS ) {
			MessageBox("Now the device is disable to use.");
			bError = TRUE;
			break;
		}
        m_Micr1.SetDataEventEnabled( TRUE );

		// Open the POS Printer
		m_Ptr1.Open("Unit1");
		if( m_Ptr1.GetResultCode() != OPOS_SUCCESS ) {
			MessageBox("This device has not been registered, or cannot use.");
			bError = TRUE;
			break;
		}
		m_Ptr1.ClaimDevice( 1000 );
        if( m_Ptr1.GetResultCode() != OPOS_SUCCESS ) {
            MessageBox("Fails to get the exclusive right for the device.");
			bError = TRUE;
			break;
        }
		m_Ptr1.SetDeviceEnabled( TRUE );
		if( m_Ptr1.GetResultCode() != OPOS_SUCCESS ) {
			MessageBox("Now the device is disable to use.");
			bError = TRUE;
			break;
		}
		// Confirm whether supporting printing both sides, or not.
		if( m_Ptr1.GetCapSlpBothSidesPrint() == FALSE ) {
			MessageBox("The device does not support for printing both sides. Fails to operate the step.");
			bPtrError = TRUE;
			break;
		}

		// Set the edit box of parameter input.
		CString	strParam = _T("ModelName,HoursPoweredCount,GoodReadCount");
		m_edtRetrieveSt.SetWindowText( strParam );

		// Checks whether it has function to obtain 
		// the statistics of devices.
		// If it does not have the function, invalidates
		// the [Retrieve Statistics] button and the edit box
		// of parameter input.
		if( !m_Micr1.GetCapStatisticsReporting() )
		{	// CapStatisticsReporting = FALSE
			GetDlgItem(IDC_EDIT_RETRIEVST)->EnableWindow(FALSE);
			GetDlgItem(IDC_BTN_RETRIEVST)->EnableWindow(FALSE);
			GetDlgItem(IDC_STC_DST)->EnableWindow(FALSE);
		}

		break;
	}

	if( bError )
	{
		//Disable all buttons
		GetDlgItem(IDC_BTN_INSERT)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_REMOVE)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_PRINT)->EnableWindow(FALSE);
		GetDlgItem(IDC_EDIT_RETRIEVST)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_RETRIEVST)->EnableWindow(FALSE);
		GetDlgItem(IDC_STC_DST)->EnableWindow(FALSE);
		GetDlgItem(IDC_STC_RD)->EnableWindow(FALSE);
		GetDlgItem(IDC_STC_AN)->EnableWindow(FALSE);
		GetDlgItem(IDC_STC_AMOUNT)->EnableWindow(FALSE);
		GetDlgItem(IDC_STC_BN)->EnableWindow(FALSE);
		GetDlgItem(IDC_STC_CT)->EnableWindow(FALSE);
		GetDlgItem(IDC_STC_CC)->EnableWindow(FALSE);
		GetDlgItem(IDC_STC_EPC)->EnableWindow(FALSE);
		GetDlgItem(IDC_STC_SN)->EnableWindow(FALSE);
		GetDlgItem(IDC_STC_TN)->EnableWindow(FALSE);
	}
	if( bPtrError )
	{
		//Disable Print buttons
		GetDlgItem(IDC_BTN_PRINT)->EnableWindow(FALSE);
	}

	return TRUE;  // return TRUE  unless you set the focus to a control
}

// If you add a minimize button to your dialog, you will need the code below
//  to draw the icon.  For MFC applications using the document/view model,
//  this is automatically done for you by the framework.

void CMICRDlg::OnPaint() 
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

HCURSOR CMICRDlg::OnQueryDragIcon()
{
	return (HCURSOR) m_hIcon;
}

void CMICRDlg::OnClose() 
{
	//Cancel the device
	m_Micr1.SetDeviceEnabled( FALSE );
	//Release the device exclusive control right.
	//(Notice:When using an old CO, use the Release.)
	m_Micr1.ReleaseDevice();
	//Finish using the device.
	m_Micr1.Close();

	m_Ptr1.SetDeviceEnabled( FALSE );
	m_Ptr1.ReleaseDevice();
	m_Ptr1.Close();
	
	CDialog::OnClose();
}

////////////////////////////////////////////////////////////////////////////////
//	Insert
//
void CMICRDlg::OnBtnInsert() 
{
	long ret;

	while(1) {
		ret = m_Micr1.BeginInsertion( 3000 );
		if( ret == OPOS_SUCCESS )
			break;
		else if( ret == OPOS_E_TIMEOUT ){
			ret = MessageBox("Please insert a check.", "Insert", MB_ICONINFORMATION | MB_RETRYCANCEL );
			if( ret == IDCANCEL )
			{
				m_Micr1.EndInsertion();
				return;
			}
		}
		else {
			MessageBox("insert error.");
			break;
		}
	}

	m_Micr1.EndInsertion();
}

////////////////////////////////////////////////////////////////////////////////
//	Print
//
void CMICRDlg::OnBtnPrint() 
{
	CTime t = CTime::GetCurrentTime();
    CString fDate;

    // Begining Process
    fDate = t.Format("%I:%M %p   %B %d, %Y");
    // Endorse printout
    // Select the reverse side
    m_Ptr1.ChangePrintSide( PTR_PS_SIDE2 );

    m_Ptr1.PrintNormal( PTR_S_SLIP, "\n");
    m_Ptr1.PrintNormal( PTR_S_SLIP, "\x1b|rADATE " + fDate + "\n");
    m_Ptr1.PrintNormal( PTR_S_SLIP, "\x1b|rASEIKO EPSON CORPORATION\n");
}

////////////////////////////////////////////////////////////////////////////////
//	Remove
//
void CMICRDlg::OnBtnRemove() 
{
    long ret;
    int i;

    ret = m_Micr1.BeginRemoval( 3000 );
    if( ret == OPOS_E_TIMEOUT )
        MessageBox("Please remove a check.");
	else if( ret != OPOS_SUCCESS ) {
        MessageBox("remove error.");
        return;
    }

    i = 1;
    while( m_Micr1.EndRemoval() != OPOS_SUCCESS ) {
        MessageBox("Please remove a check.");
        // error message is 5 Limit
        if( ++i == 5 )
			break;
    }
}

////////////////////////////////////////////////////////////////////////////////
//	Events
//
BEGIN_EVENTSINK_MAP(CMICRDlg, CDialog)
    //{{AFX_EVENTSINK_MAP(CMICRDlg)
	ON_EVENT(CMICRDlg, IDC_MICR1, 1 /* DataEvent */, OnDataEventMicr1, VTS_I4)
	ON_EVENT(CMICRDlg, IDC_MICR1, 3 /* ErrorEvent */, OnErrorEventMicr1, VTS_I4 VTS_I4 VTS_I4 VTS_PI4)
	ON_EVENT(CMICRDlg, IDC_MICR1, 5 /* StatusUpdateEvent */, OnStatusUpdateEventMicr1, VTS_I4)
	//}}AFX_EVENTSINK_MAP
END_EVENTSINK_MAP()

////////////////////////////////////////////////////////////////////////////////
//	DataEvent
//
void CMICRDlg::OnDataEventMicr1(long Status) 
{
	CString sBuf;

	GetDlgItem(IDC_EDIT_RAWDATA)->SetWindowText( m_Micr1.GetRawData());
	GetDlgItem(IDC_EDIT_ACCOUNT)->SetWindowText( m_Micr1.GetAccountNumber());
	GetDlgItem(IDC_EDIT_AMOUNT)->SetWindowText( m_Micr1.GetAmount());
	GetDlgItem(IDC_EDIT_BANK)->SetWindowText( m_Micr1.GetBankNumber());

	sBuf.Empty();
	switch( m_Micr1.GetCheckType()) {
	case MICR_CT_PERSONAL:
		sBuf = "PERSONAL";
		break;
	case MICR_CT_BUSINESS:
		sBuf = "BUSINESS";
		break;
	case MICR_CT_UNKNOWN:
		sBuf = "UNKNOWN";
		break;
	}
	GetDlgItem(IDC_EDIT_CHECK)->SetWindowText( sBuf );

	sBuf.Empty();
	switch( m_Micr1.GetCountryCode()) {
	case MICR_CC_USA:
		sBuf = "USA";
		break;
	case MICR_CC_CANADA:
        sBuf = "CANADA";
		break;
	case MICR_CC_MEXICO:
        sBuf = "MEXICO";
		break;
	case MICR_CC_UNKNOWN:
		sBuf = "UNKNOWN";
		break;
	}
	GetDlgItem(IDC_EDIT_COUNTRY)->SetWindowText( sBuf );

	GetDlgItem(IDC_EDIT_EPC)->SetWindowText( m_Micr1.GetEpc());
	GetDlgItem(IDC_EDIT_SERIAL)->SetWindowText( m_Micr1.GetSerialNumber());
	GetDlgItem(IDC_EDIT_TRANSIT)->SetWindowText( m_Micr1.GetTransitNumber());

	m_Micr1.SetDataEventEnabled( TRUE );
}

////////////////////////////////////////////////////////////////////////////////
//	ErrorEvent
//
void CMICRDlg::OnErrorEventMicr1(long ResultCode, long ResultCodeExtended, long ErrorLocus, long FAR* pErrorResponse) 
{
	CString sRC;
	CString sRCE;

	sRC.Format("ResultCode = %ld\n", ResultCode );
	sRCE.Format("ResultCodeExtended = %ld\n", ResultCodeExtended );
	MessageBox("MICR Error.\n\n" + sRC + sRCE, "ErrorEvent", MB_ICONINFORMATION );
}

////////////////////////////////////////////////////////////////////////////////
//	StatusUpdateEvent
//
void CMICRDlg::OnStatusUpdateEventMicr1(long Data) 
{
// The Power Reporting Requirements fires the event when the device power status is changed.
	switch( Data ) {
	case OPOS_SUE_POWER_ONLINE:			// The device is powered on.
		MessageBox("The device is powered on.");
		break;
	case OPOS_SUE_POWER_OFF:			// The device is powered off, or unconnected.
		MessageBox("The device is powered off, or unconnected.");
		break;
	case OPOS_SUE_POWER_OFFLINE:		// The device is powered on, but disable to operate.
		MessageBox("The device is powered on, but disable to operate.");
		break;
	case OPOS_SUE_POWER_OFF_OFFLINE:	// The device is powered off or off-line.
		MessageBox("ThThe device is powered off or off-line.");
		break;
	}
}

void CMICRDlg::OnBtnRetrievSt() 
{
	CString	strParam;
	CString	strErrMsg;
	CString	strXMLPath;
	BSTR	bstrParam;

    m_edtRetrieveSt.GetWindowText(strParam);
    strErrMsg.Empty();
	bstrParam = strParam.AllocSysString();

    // Obtains the statistics of the device and stores it in a file.
	m_Micr1.RetrieveStatistics( &bstrParam );
	if( m_Micr1.GetResultCode() != OPOS_SUCCESS )
	{
		CString	strTemp;
		strErrMsg  = _T("RetrieveStatistics method error.\n\n");
		strTemp.Format("%d", m_Micr1.GetResultCode() );
		strErrMsg += _T("ResultCode = ") + strTemp + _T("\n");
		strTemp.Format("%d", m_Micr1.GetResultCodeExtended() );
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

