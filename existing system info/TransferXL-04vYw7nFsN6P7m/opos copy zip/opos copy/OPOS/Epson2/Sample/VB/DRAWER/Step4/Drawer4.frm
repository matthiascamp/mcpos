VERSION 5.00
Object = "{CCB90040-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSCashDrawer.ocx"
Begin VB.Form Step4 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 4 Obtains the statistics of the device."
   ClientHeight    =   3930
   ClientLeft      =   45
   ClientTop       =   330
   ClientWidth     =   4785
   LinkTopic       =   "MDIForm1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   3930
   ScaleWidth      =   4785
   Begin VB.Frame Frame5 
      Caption         =   "Device Statistics"
      Height          =   1440
      Left            =   210
      TabIndex        =   7
      Top             =   2280
      Width           =   3000
      Begin VB.CommandButton cmdRetrieveSt 
         Caption         =   "Retrieve Statistics"
         Height          =   435
         Left            =   100
         TabIndex        =   9
         Top             =   870
         Width           =   2775
      End
      Begin VB.TextBox txtRetrieveSt 
         Height          =   285
         Left            =   100
         TabIndex        =   8
         Top             =   530
         Width           =   2775
      End
      Begin VB.Label Label6 
         Caption         =   "RetrieveStatistics parameter"
         Height          =   255
         Left            =   100
         TabIndex        =   10
         Top             =   300
         Width           =   2775
      End
   End
   Begin VB.CommandButton cmdExit 
      Caption         =   "Close"
      Height          =   345
      Left            =   3360
      TabIndex        =   6
      Top             =   105
      Width           =   990
   End
   Begin VB.Frame Frame1 
      Height          =   1065
      Left            =   210
      TabIndex        =   1
      Top             =   1050
      Width           =   2640
      Begin VB.TextBox Text2 
         BackColor       =   &H8000000F&
         Height          =   270
         Left            =   945
         Locked          =   -1  'True
         TabIndex        =   5
         Top             =   630
         Width           =   1065
      End
      Begin VB.TextBox Text1 
         BackColor       =   &H8000000F&
         Height          =   270
         Left            =   945
         Locked          =   -1  'True
         TabIndex        =   3
         Top             =   315
         Width           =   1065
      End
      Begin VB.Label Label2 
         Caption         =   "Power"
         Height          =   225
         Left            =   315
         TabIndex        =   4
         Top             =   630
         Width           =   645
      End
      Begin VB.Label Label1 
         Caption         =   "Status"
         Height          =   225
         Left            =   315
         TabIndex        =   2
         Top             =   315
         Width           =   645
      End
   End
   Begin VB.CommandButton Command1 
      Caption         =   "Open"
      Height          =   450
      Left            =   420
      TabIndex        =   0
      Top             =   315
      Width           =   2250
   End
   Begin OposCashDrawer_CCOCtl.OPOSCashDrawer OPOSCashDrawer1 
      Left            =   3720
      OleObjectBlob   =   "Drawer4.frx":0000
      Top             =   720
   End
End
Attribute VB_Name = "Step4"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
'Step 4 Adding error handlers.
Option Explicit

Private Sub cmdExit_Click()

    Unload Me

End Sub

Private Sub cmdRetrieveSt_Click()

    Dim strParam As String
    Dim lLen As Long
    Dim strErrMsg As String
    Dim strXMLPath As String
    Dim strFindXMLPath As String

    strParam = txtRetrieveSt.Text
    strErrMsg = ""
    strFindXMLPath = ""

    ' Obtains the statistics of the device and stores it in a file.
    With OPOSCashDrawer1
        .RetrieveStatistics strParam
        If (.ResultCode <> OPOS_SUCCESS) Then
            strErrMsg = "RetrieveStatistics method error." + vbCrLf + vbCrLf
            strErrMsg = strErrMsg + "ResultCode = " + CStr(.ResultCode) + vbCrLf
            strErrMsg = strErrMsg + "ResultCodeExtended = " + CStr(.ResultCodeExtended)
            MsgBox strErrMsg, vbOKOnly + vbExclamation, "CashDrawer"
            Exit Sub
        End If
    End With
    
    strXMLPath = App.Path + "\Sample.xml"
    'Delete XML file.
    strFindXMLPath = Dir(strXMLPath)
    If strFindXMLPath <> "" Then
        Kill (strXMLPath)
    End If
    'Create XML file.
    Open strXMLPath For Binary Access Write As #1
        Put #1, , strParam
    Close #1
    
    'Opens another window and indicates the information of the XML file.
    Step4Browser.Show

End Sub

'Open a drawer
'
Private Sub Command1_Click()

    OPOSCashDrawer1.OpenDrawer
    Select Case OPOSCashDrawer1.ResultCodeExtended
        Case OPOS_EPTR_COVER_OPEN
            MsgBox "OpenDrawer Error" + vbCrLf + "Printer Cover Open"
        Case OPOS_EPTR_JRN_EMPTY
            MsgBox "OpenDrawer Error" + vbCrLf + "Printer Journal Empty"
        Case OPOS_EPTR_REC_EMPTY
            MsgBox "OpenDrawer Error" + vbCrLf + "Printer Receipt Empty"
        Case Else
            If (OPOSCashDrawer1.ResultCode <> OPOS_SUCCESS) Then
                MsgBox "OpenDrawer Error"
            End If
    End Select
    
End Sub

Private Sub Form_Load()

    With OPOSCashDrawer1
        .Open "Unit1"
        ' Error check
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "This device has not been registered, or cannot use."
            GoTo LoadError
        End If
        
        .ClaimDevice 1000
        ' Error check
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Fails to get the exclusive right for the device."
            GoTo LoadError
        End If
        
        ' If support the CapPowerReporting, enable the Power Reporting Requirements.
        If .CapPowerReporting <> OPOS_PR_NONE Then
            .PowerNotify = OPOS_PN_ENABLED
        End If
        
        .DeviceEnabled = True
        ' Error check
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Now the device is disable to use."
            GoTo LoadError
        End If
        
        ' Check whether enable to monitor the drawer open/close status, or not.
        If .CapStatus = True Then
            ' Disable to monitor
            Frame1.Enabled = False
        End If
        
        ' Set the edit box of parameter input.
        txtRetrieveSt.Text = "ModelName,HoursPoweredCount,DrawerGoodOpenCount"
        
        ' Checks whether it has function to obtain
        ' the statistics of devices.
        ' If it does not have the function, invalidates
        ' the [Retrieve Statistics] button and the edit box
        ' of parameter input.
        If .CapStatisticsReporting = False Then
            cmdRetrieveSt.Enabled = False
            txtRetrieveSt.Enabled = False
        End If
        
    End With

    Exit Sub

LoadError:
' Nothing can be used.
    Dim OBJ As Object
    'All objects on the form
    For Each OBJ In Me
        'Invalid exept for OPOS OCX
        If OBJ.Name <> "OPOSCashDrawer1" Then
            OBJ.Enabled = False
        End If
    Next
    cmdExit.Enabled = True              'Only the exit button is enabled.

End Sub

Private Sub Form_Unload(Cancel As Integer)

    With OPOSCashDrawer1
        .DeviceEnabled = False
        .ReleaseDevice
        .Close
    End With

End Sub

Private Sub OPOSCashDrawer1_StatusUpdateEvent(ByVal Data As Long)

    Select Case Data
    Case CASH_SUE_DRAWERCLOSED          'Drawer is closed
        Text1.Text = "Close"
    Case CASH_SUE_DRAWEROPEN            'Drawer is opened
        Text1.Text = "Open"
'The Power Reporting Requirements fires the event when the device power status is changed.
    Case OPOS_SUE_POWER_ONLINE          ' The device is powered on.
        Text2.Text = "ready"
    Case OPOS_SUE_POWER_OFF             ' The device is powered off, or unconnected.
        Text2.Text = "OFF"
    Case OPOS_SUE_POWER_OFFLINE         ' The device is powered on, but disable to operate.
        Text2.Text = "not ready"
    Case OPOS_SUE_POWER_OFF_OFFLINE     ' The device is powered off or off-line.
        Text2.Text = "Offline"
    End Select
End Sub

