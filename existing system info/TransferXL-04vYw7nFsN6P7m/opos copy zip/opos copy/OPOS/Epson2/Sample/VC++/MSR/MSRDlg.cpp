// MSRDlg.cpp : implementation file
//

#include "stdafx.h"
#include "MSR.h"
#include "MSRDlg.h"
#include "OposMsr.h"
#include "XMLView.h"

#ifdef _DEBUG
#define new DEBUG_NEW
#undef THIS_FILE
static char THIS_FILE[] = __FILE__;
#endif

/////////////////////////////////////////////////////////////////////////////
// CMSRDlg dialog

CMSRDlg::CMSRDlg(CWnd* pParent /*=NULL*/)
	: CDialog(CMSRDlg::IDD, pParent)
{
	//{{AFX_DATA_INIT(CMSRDlg)
	//}}AFX_DATA_INIT
	m_hIcon = AfxGetApp()->LoadIcon(IDR_MAINFRAME);
}

void CMSRDlg::DoDataExchange(CDataExchange* pDX)
{
	CDialog::DoDataExchange(pDX);
	//{{AFX_DATA_MAP(CMSRDlg)
	DDX_Control(pDX, IDC_EDIT_RETRIEVST, m_edtRetrieveSt);
	DDX_Control(pDX, IDC_MSR1, m_Msr1);
	//}}AFX_DATA_MAP
}

BEGIN_MESSAGE_MAP(CMSRDlg, CDialog)
	//{{AFX_MSG_MAP(CMSRDlg)
	ON_WM_PAINT()
	ON_WM_QUERYDRAGICON()
	ON_WM_CLOSE()
	ON_BN_CLICKED(IDC_BTN_RETRIEVST, OnBtnRetrievSt)
	//}}AFX_MSG_MAP
END_MESSAGE_MAP()

/////////////////////////////////////////////////////////////////////////////
// CMSRDlg message handlers

BOOL CMSRDlg::OnInitDialog()
{
	CDialog::OnInitDialog();

	SetIcon(m_hIcon, TRUE);			// Set big icon
	SetIcon(m_hIcon, FALSE);		// Set small icon
	
	// TODO: Add extra initialization here
	BOOL bError = FALSE;
	while( 1 ) {
		//Open the device
		//Use a Logical Device Name which has been set on the SetupPOS.
		m_Msr1.Open("Unit1");
		//Check whether the device is succeed to open, or not
		if( m_Msr1.GetResultCode() != OPOS_SUCCESS ) {
			MessageBox("This device has not been registered, or cannot use.");
			bError = TRUE;
			break;
		}

        //Get the exclusive control right for the opened device.
        //Then the device is disable from other application.
        //(Notice:When using an old CO, use the Claim.)
		m_Msr1.ClaimDevice( 1000 );
        if( m_Msr1.GetResultCode() != OPOS_SUCCESS ) {
            MessageBox("Fails to get the exclusive right for the device.");
			bError = TRUE;
			break;
        }

        //Enable the device.
		m_Msr1.SetDeviceEnabled( TRUE );
		//Check whether the device is enable to use, or not
		if( m_Msr1.GetResultCode() != OPOS_SUCCESS ) {
			MessageBox("Now the device is disable to use.");
			bError = TRUE;
			break;
		}

        m_Msr1.SetDataEventEnabled( TRUE );
        m_Msr1.SetParseDecodeData( TRUE );

		// Set the edit box of parameter input.
		CString	strParam = _T("ModelName,HoursPoweredCount,GoodReadCount");
		m_edtRetrieveSt.SetWindowText( strParam );

		// Checks whether it has function to obtain 
		// the statistics of devices.
		// If it does not have the function, invalidates
		// the [Retrieve Statistics] button and the edit box
		// of parameter input.
		if( !m_Msr1.GetCapStatisticsReporting() )
		{	// CapStatisticsReporting = FALSE
			GetDlgItem(IDC_EDIT_RETRIEVST)->EnableWindow(FALSE);
			GetDlgItem(IDC_BTN_RETRIEVST)->EnableWindow(FALSE);
			GetDlgItem(IDC_STC_DST)->EnableWindow(FALSE);
		}

		break;
	}

	if( bError ) {
		//Disable all buttons
		GetDlgItem(IDC_LBL_TITLE)->EnableWindow(FALSE);
		GetDlgItem(IDC_LBL_ACCOUNT)->EnableWindow(FALSE);
		GetDlgItem(IDC_LBL_DATE)->EnableWindow(FALSE);
		GetDlgItem(IDC_LBL_FIRST)->EnableWindow(FALSE);
		GetDlgItem(IDC_LBL_SUR)->EnableWindow(FALSE);
		GetDlgItem(IDC_LBL_MIDDLE)->EnableWindow(FALSE);
		GetDlgItem(IDC_LBL_TRACK1)->EnableWindow(FALSE);
		GetDlgItem(IDC_LBL_TRACK2)->EnableWindow(FALSE);
		GetDlgItem(IDC_LBL_TRACK3)->EnableWindow(FALSE);
		GetDlgItem(IDC_LBL_TRACK4)->EnableWindow(FALSE);
		GetDlgItem(IDC_EDIT_RETRIEVST)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_RETRIEVST)->EnableWindow(FALSE);
		GetDlgItem(IDC_STC_DST)->EnableWindow(FALSE);
	}

	return TRUE;  // return TRUE  unless you set the focus to a control
}

// If you add a minimize button to your dialog, you will need the code below
//  to draw the icon.  For MFC applications using the document/view model,
//  this is automatically done for you by the framework.

void CMSRDlg::OnPaint() 
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

HCURSOR CMSRDlg::OnQueryDragIcon()
{
	return (HCURSOR) m_hIcon;
}

void CMSRDlg::OnClose() 
{
	//Cancel the device
	m_Msr1.SetDeviceEnabled( FALSE );

	//Release the device exclusive control right.
	//(Notice:When using an old CO, use the Release.)
	m_Msr1.ReleaseDevice();

	//Finish using the device.
	m_Msr1.Close();

	CDialog::OnClose();
}

////////////////////////////////////////////////////////////////////////////////
//	Events
//
BEGIN_EVENTSINK_MAP(CMSRDlg, CDialog)
    //{{AFX_EVENTSINK_MAP(CMSRDlg)
	ON_EVENT(CMSRDlg, IDC_MSR1, 1 /* DataEvent */, OnDataEventMsr1, VTS_I4)
	ON_EVENT(CMSRDlg, IDC_MSR1, 3 /* ErrorEvent */, OnErrorEventMsr1, VTS_I4 VTS_I4 VTS_I4 VTS_PI4)
	//}}AFX_EVENTSINK_MAP
END_EVENTSINK_MAP()

////////////////////////////////////////////////////////////////////////////////
//	DataEvent
//
void CMSRDlg::OnDataEventMsr1(long Status) 
{
	CTime t = CTime::GetCurrentTime();
	CString sToday;
	CString sExp;
	CString sDate;

	// (Account No.)
	GetDlgItem(IDC_EDIT_ACCOUNT)->SetWindowText( m_Msr1.GetAccountNumber());

// *** Get the current date. If the invalid date, display it.
	sExp = m_Msr1.GetExpirationDate();
	sDate = sExp.Left( 2 );
	if( sDate < "80" )			// Under 80
		sDate = "20" + sExp;		// Consider it as after 2000
	else						// Over 80
		sDate = "19" + sExp;		// Consider it as in 19s.
	// Conparing with the current date
    sToday = t.Format("%Y%m");
	if( sToday > sDate )
		sExp += " (Invalid)";
	GetDlgItem(IDC_EDIT_DATE)->SetWindowText( sExp );				//(Valid date)

	GetDlgItem(IDC_EDIT_FIRST)->SetWindowText( m_Msr1.GetFirstName());		//(First Name)
	GetDlgItem(IDC_EDIT_SUR)->SetWindowText( m_Msr1.GetSurname());			//(Family Name)
	GetDlgItem(IDC_EDIT_MIDDLE)->SetWindowText( m_Msr1.GetMiddleInitial());	//(Middle Initial)
	GetDlgItem(IDC_EDIT_TRACK1)->SetWindowText( m_Msr1.GetTrack1Data());
	GetDlgItem(IDC_EDIT_TRACK2)->SetWindowText( m_Msr1.GetTrack2Data());
	GetDlgItem(IDC_EDIT_TRACK3)->SetWindowText( m_Msr1.GetTrack3Data());
	GetDlgItem(IDC_EDIT_TRACK4)->SetWindowText( m_Msr1.GetTrack4Data());

	m_Msr1.SetDataEventEnabled( TRUE );
}

////////////////////////////////////////////////////////////////////////////////
//	ErrorEvent
//
void CMSRDlg::OnErrorEventMsr1(long ResultCode, long ResultCodeExtended, long ErrorLocus, long FAR* pErrorResponse) 
{
	CString sRC;
	CString sRCE;

	sRC.Format("ResultCode = %ld\n", ResultCode );
	sRCE.Format("ResultCodeExtended = %ld\n", ResultCodeExtended );
	MessageBox("MSR Error.\n\n" + sRC + sRCE, "ErrorEvent", MB_ICONINFORMATION );
}

void CMSRDlg::OnBtnRetrievSt() 
{
	CString	strParam;
	CString	strErrMsg;
	CString	strXMLPath;
	BSTR	bstrParam;

    m_edtRetrieveSt.GetWindowText(strParam);
    strErrMsg.Empty();
	bstrParam = strParam.AllocSysString();

    // Obtains the statistics of the device and stores it in a file.
	m_Msr1.RetrieveStatistics( &bstrParam );
	if( m_Msr1.GetResultCode() != OPOS_SUCCESS )
	{
		CString	strTemp;
		strErrMsg  = _T("RetrieveStatistics method error.\n\n");
		strTemp.Format("%d", m_Msr1.GetResultCode() );
		strErrMsg += _T("ResultCode = ") + strTemp + _T("\n");
		strTemp.Format("%d", m_Msr1.GetResultCodeExtended() );
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

