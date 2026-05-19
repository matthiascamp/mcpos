// DisplayDlg.cpp : implementation file
//

#include "stdafx.h"
#include "Display.h"
#include "DisplayDlg.h"
#include "OPOS.h"
#include "OPOSDisp.h"
#include "EPSNDisp.h"
#include "XMLView.h"

#ifdef _DEBUG
#define new DEBUG_NEW
#undef THIS_FILE
static char THIS_FILE[] = __FILE__;
#endif

/////////////////////////////////////////////////////////////////////////////
// CDisplayDlg dialog

CDisplayDlg::CDisplayDlg(CWnd* pParent /*=NULL*/)
	: CDialog(CDisplayDlg::IDD, pParent)
{
	//{{AFX_DATA_INIT(CDisplayDlg)
	m_EditField = _T("");
	//}}AFX_DATA_INIT
	m_hIcon = AfxGetApp()->LoadIcon(IDR_MAINFRAME);
}

void CDisplayDlg::DoDataExchange(CDataExchange* pDX)
{
	CDialog::DoDataExchange(pDX);
	//{{AFX_DATA_MAP(CDisplayDlg)
	DDX_Control(pDX, IDC_EDIT_RETRIEVST, m_edtRetrieveSt);
	DDX_Text(pDX, IDC_EDIT1, m_EditField);
	DDX_Control(pDX, IDC_LINEDISPLAY1, m_Disp1);
	//}}AFX_DATA_MAP
}

BEGIN_MESSAGE_MAP(CDisplayDlg, CDialog)
	//{{AFX_MSG_MAP(CDisplayDlg)
	ON_WM_PAINT()
	ON_WM_QUERYDRAGICON()
	ON_BN_CLICKED(IDC_BTN_CLEAR, OnBtnClear)
	ON_BN_CLICKED(IDC_BTN_POSITION, OnBtnPosition)
	ON_BN_CLICKED(IDC_BTN_BLINK, OnBtnBlink)
	ON_BN_CLICKED(IDC_BTN_TELETYPE, OnBtnTeletype)
	ON_BN_CLICKED(IDC_BTN_CONTROL, OnBtnControl)
	ON_BN_CLICKED(IDC_BTN_SCLEFT, OnBtnScleft)
	ON_BN_CLICKED(IDC_BTN_SCRIGHT, OnBtnScright)
	ON_BN_CLICKED(IDC_BTN_ORNAMENTS, OnBtnOrnaments)
	ON_BN_CLICKED(IDC_BTN_BITMAP, OnBtnBitmap)
	ON_WM_CLOSE()
	ON_BN_CLICKED(IDC_BTN_DEFINEGLYPH, OnBtnDefineglyph)
	ON_BN_CLICKED(IDC_BTN_READCHARACTER, OnBtnReadcharacter)
	ON_BN_CLICKED(IDC_BTN_RETRIEVST, OnBtnRetrievSt)
	//}}AFX_MSG_MAP
END_MESSAGE_MAP()

/////////////////////////////////////////////////////////////////////////////
// CDisplayDlg message handlers

BOOL CDisplayDlg::OnInitDialog()
{
	CDialog::OnInitDialog();

	SetIcon(m_hIcon, TRUE);			// Set big icon
	SetIcon(m_hIcon, FALSE);		// Set small icon
	
	// TODO: Add extra initialization here
	BOOL bError = FALSE;
    while( 1 ) {
		//Open the device
		//Use a Logical Device Name which has been set on the SetupPOS.
		m_Disp1.Open("Unit1");
		//Check whether the device is succeed to open, or not
		if( m_Disp1.GetResultCode() != OPOS_SUCCESS ) {
			MessageBox("This device has not been registered, or cannot use.");
			bError = TRUE;
			break;
		}

		//Get the exclusive control right for the opened device.
		//Then the device is disable from other application.
		//(Notice:When using an old CO, use the Claim.)
		m_Disp1.ClaimDevice( 1000 );
        if( m_Disp1.GetResultCode() != OPOS_SUCCESS ) {
            MessageBox("Fails to get the exclusive right for the device.");
			bError = TRUE;
			break;
        }

		//If support the CapPowerReporting, 
		//enable the Power Reporting Requirements.
        if( m_Disp1.GetCapPowerReporting() != OPOS_PR_NONE ){
			m_Disp1.SetPowerNotify( OPOS_PN_ENABLED );
        }

		//Enable the device.
		m_Disp1.SetDeviceEnabled( TRUE );
		//Check whether the device is enable to use, or not
		if( m_Disp1.GetResultCode() != OPOS_SUCCESS ) {
			MessageBox("Now the device is disable to use.");
			bError = TRUE;
			break;
		}

		//Supports only for the Graphic Display(EPSON DM-D500 series)
		CString sDevName = m_Disp1.GetDeviceName();
		if( sDevName.Left(5) != "DM-D5" ) {
			GetDlgItem(IDC_BTN_ORNAMENTS)->EnableWindow(FALSE);
			GetDlgItem(IDC_BTN_BITMAP)->EnableWindow(FALSE);
		}

		// Set the edit box of parameter input.
		CString	strParam = _T("ModelName,HoursPoweredCount,OnlineTransitionCount");
		m_edtRetrieveSt.SetWindowText( strParam );

		// Checks whether it has function to obtain 
		// the statistics of devices.
		// If it does not have the function, invalidates
		// the [Retrieve Statistics] button and the edit box
		// of parameter input.
		if( !m_Disp1.GetCapStatisticsReporting() )
		{	// CapStatisticsReporting = FALSE
			GetDlgItem(IDC_EDIT_RETRIEVST)->EnableWindow(FALSE);
			GetDlgItem(IDC_BTN_RETRIEVST)->EnableWindow(FALSE);
			GetDlgItem(IDC_STC_DST)->EnableWindow(FALSE);
		}

		break;
	}

	if( bError ) {
		//Disable all buttons
		GetDlgItem(IDC_BTN_CLEAR)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_POSITION)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_BLINK)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_DEFINEGLYPH)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_TELETYPE)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_CONTROL)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_SCLEFT)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_SCRIGHT)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_ORNAMENTS)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_BITMAP)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_READCHARACTER)->EnableWindow(FALSE);
		GetDlgItem(IDC_EDIT_RETRIEVST)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_RETRIEVST)->EnableWindow(FALSE);
		GetDlgItem(IDC_STC_DST)->EnableWindow(FALSE);
		GetDlgItem(IDC_STC_GDISP)->EnableWindow(FALSE);
		GetDlgItem(IDC_STC_SCROLL)->EnableWindow(FALSE);
	}

	return TRUE;  // return TRUE  unless you set the focus to a control
}

// If you add a minimize button to your dialog, you will need the code below
//  to draw the icon.  For MFC applications using the document/view model,
//  this is automatically done for you by the framework.

void CDisplayDlg::OnPaint() 
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

HCURSOR CDisplayDlg::OnQueryDragIcon()
{
	return (HCURSOR) m_hIcon;
}

void CDisplayDlg::OnClose() 
{
	//Cancel the device
	m_Disp1.SetDeviceEnabled( FALSE );

	//Release the device exclusive control right.
	//(Notice:When using an old CO, use the Release.)
	m_Disp1.ReleaseDevice();

	//Finish using the device.
	m_Disp1.Close();

	CDialog::OnClose();
}

////////////////////////////////////////////////////////////////////////////////
//	Clear the text on the window
//
void CDisplayDlg::OnBtnClear() 
{
	m_Disp1.SetInterCharacterWait( 0 );
	m_Disp1.ClearText();
}

////////////////////////////////////////////////////////////////////////////////
//	Display the text as specified.
//
void CDisplayDlg::OnBtnPosition() 
{
	m_Disp1.SetInterCharacterWait( 0 );

	m_Disp1.DisplayTextAt( 1, 5, "Hello OPOS.", DISP_DT_NORMAL);
}

////////////////////////////////////////////////////////////////////////////////
//	The character of the specified position is acquired.
//
void CDisplayDlg::OnBtnReadcharacter() 
{
	long displayCharacter;
	
	// A cursor position is specified and a character is acquired.
	// 7F are set when there is no character in the specified position.
	m_Disp1.SetCursorRow(1);
	m_Disp1.SetCursorColumn(5);
	m_Disp1.ReadCharacterAtCursor(&displayCharacter);

	// The acquired character is displayed. (Ascii Code)
	UpdateData(TRUE);
	m_EditField.Format("%02x", displayCharacter);
	UpdateData(FALSE);
}

////////////////////////////////////////////////////////////////////////////////
//	Display the blinking text
//
void CDisplayDlg::OnBtnBlink() 
{
	m_Disp1.SetInterCharacterWait( 0 );

	m_Disp1.DisplayText("Blink", DISP_DT_BLINK );

//	The interval of blink is changed. (measure : milli second)
//	m_Disp1.SetBlinkRate(100);
}

////////////////////////////////////////////////////////////////////////////////
//	External character registration
//
void CDisplayDlg::OnBtnDefineglyph() 
{
	//External character registration
	m_Disp1.SetBinaryConversion(OPOS_BC_NIBBLE);
	m_Disp1.DefineGlyph(95, "08041209040201");// //
        //Case DM-D500
	//m_Disp1.DefineGlyph(95, "00081<3663637?7?6363630000000000");//A

	m_Disp1.SetBinaryConversion(OPOS_BC_NONE);

	//The registered character is displayed.
	m_Disp1.DisplayTextAt(0, 10, "_", DISP_DT_NORMAL);
}

////////////////////////////////////////////////////////////////////////////////
//	Teletype display
//
void CDisplayDlg::OnBtnTeletype() 
{
	m_Disp1.SetInterCharacterWait( 1000 );
	m_Disp1.DisplayText("Teletype", DISP_DT_NORMAL );
}

////////////////////////////////////////////////////////////////////////////////
//	Window control
//
void CDisplayDlg::OnBtnControl() 
{
	m_Disp1.SetInterCharacterWait( 0 );

	m_Disp1.CreateWindow0( 1, 10, 1, 10, 1, 34 );
	m_Disp1.SetMarqueeFormat( DISP_MF_WALK );
	m_Disp1.SetMarqueeType( DISP_MT_INIT );
	m_Disp1.SetMarqueeRepeatWait( 1000 );
	m_Disp1.SetMarqueeUnitWait( 100 );
	m_Disp1.DisplayText("Sale! 50%-20% OFF!", DISP_DT_NORMAL );
	m_Disp1.SetMarqueeType( DISP_MT_LEFT );

	MessageBox("When pressing OK, it ends");

	m_Disp1.SetMarqueeType( DISP_MT_INIT );
	m_Disp1.DestroyWindow0();
}

////////////////////////////////////////////////////////////////////////////////
//	Scrolled display
//
void CDisplayDlg::OnBtnScleft() 
{
	m_Disp1.SetInterCharacterWait( 0 );

// Move one character to the left side
	m_Disp1.ScrollText( DISP_ST_LEFT, 1 );
}

////////////////////////////////////////////////////////////////////////////////
//	Scrolled display
//
void CDisplayDlg::OnBtnScright() 
{
	m_Disp1.SetInterCharacterWait( 0 );

// Move two characters to the right side
	m_Disp1.ScrollText( DISP_ST_RIGHT, 2 );
}

////////////////////////////////////////////////////////////////////////////////
//	Set Character Ornaments
//
void CDisplayDlg::OnBtnOrnaments() 
{
	CString ESC = "\x1b";

	m_Disp1.SetInterCharacterWait( 0 );
	m_Disp1.ClearText();
	m_Disp1.DisplayTextAt( 0, 0, "Normal " + ESC + "|bCBold", DISP_DT_NORMAL );
	m_Disp1.DisplayTextAt( 1, 0, ESC + "|rvCReverse" + ESC + "|bCBold&Reverse", DISP_DT_NORMAL );
	m_Disp1.DisplayText( ESC + "|bC Bold", DISP_DT_NORMAL );
}

////////////////////////////////////////////////////////////////////////////////
//	Display Bitmap
//
void CDisplayDlg::OnBtnBitmap() 
{
	long pData;
	CString ESC = "\x1b";
	CString cString;
	BSTR pString;

	m_Disp1.SetInterCharacterWait( 0 );

	pData = 1;
	cString = "Logo.bmp";
	pString = cString.AllocSysString();
	m_Disp1.DirectIO( DISP_DI_SETIMAGE, &pData, &pString );

	pData = DISP_DI_DUMMY;
	cString = "";
	pString = cString.AllocSysString();
	m_Disp1.DirectIO( DISP_DI_GRAPHIC, &pData, &pString );

	m_Disp1.CreateWindow0( 0, 0, 64, 256, 64, 256 );
	m_Disp1.DisplayText( ESC + "|1B", DISP_DT_NORMAL );

	MessageBox("When pressing Ok button, delete the window.");

	m_Disp1.DestroyWindow0();
}

////////////////////////////////////////////////////////////////////////////////
//	Events
//
BEGIN_EVENTSINK_MAP(CDisplayDlg, CDialog)
    //{{AFX_EVENTSINK_MAP(CDisplayDlg)
	ON_EVENT(CDisplayDlg, IDC_LINEDISPLAY1, 5 /* StatusUpdateEvent */, OnStatusUpdateEventLinedisplay1, VTS_I4)
	//}}AFX_EVENTSINK_MAP
END_EVENTSINK_MAP()

////////////////////////////////////////////////////////////////////////////////
//	StatusUpdateEvent
//
void CDisplayDlg::OnStatusUpdateEventLinedisplay1(long Data) 
{
//The Power Reporting Requirements fires the event when the device power status is changed.
	switch( Data ) {
	case OPOS_SUE_POWER_ONLINE:				// The device is powered on.
		MessageBox("The device is powered on.");
		break;
	case OPOS_SUE_POWER_OFF:				// The device is powered off, or unconnected.
		MessageBox("The device is powered off, or unconnected.");
		break;
	case OPOS_SUE_POWER_OFFLINE:			// The device is powered on, but disable to operate.
		MessageBox("The device is powered on, but disable to operate.");
		break;
	case OPOS_SUE_POWER_OFF_OFFLINE:		// The device is powered off or off-line.
		MessageBox("The device is powered on or off-line.");
		break;
	}
}


void CDisplayDlg::OnBtnRetrievSt() 
{
	CString	strParam;
	CString	strErrMsg;
	CString	strXMLPath;
	BSTR	bstrParam;

    m_edtRetrieveSt.GetWindowText(strParam);
    strErrMsg.Empty();
	bstrParam = strParam.AllocSysString();

	// Obtains the statistics of the device and stores it in a file.
	m_Disp1.RetrieveStatistics( &bstrParam );
	if( m_Disp1.GetResultCode() != OPOS_SUCCESS )
	{
		CString	strTemp;
		strErrMsg  = _T("RetrieveStatistics method error.\n\n");
		strTemp.Format("%d", m_Disp1.GetResultCode() );
		strErrMsg += _T("ResultCode = ") + strTemp + _T("\n");
		strTemp.Format("%d", m_Disp1.GetResultCodeExtended() );
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

