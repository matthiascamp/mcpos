VERSION 5.00
Object = "{CCB90090-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSKeylock.ocx"
Begin VB.Form Step4 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 4 Obtains the statistics of the device."
   ClientHeight    =   3150
   ClientLeft      =   45
   ClientTop       =   330
   ClientWidth     =   6210
   LinkTopic       =   "MDIForm1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   3150
   ScaleWidth      =   6210
   Begin VB.Frame Frame5 
      Caption         =   "Device Statistics"
      Height          =   1440
      Left            =   1200
      TabIndex        =   4
      Top             =   1560
      Width           =   3000
      Begin VB.TextBox txtRetrieveSt 
         Height          =   285
         Left            =   100
         TabIndex        =   5
         Top             =   530
         Width           =   2775
      End
      Begin VB.CommandButton cmdRetrieveSt 
         Caption         =   "Retrieve Statistics"
         Height          =   435
         Left            =   100
         TabIndex        =   6
         Top             =   870
         Width           =   2775
      End
      Begin VB.Label Label6 
         Caption         =   "RetrieveStatistics parameter"
         Height          =   255
         Left            =   100
         TabIndex        =   8
         Top             =   300
         Width           =   2775
      End
   End
   Begin VB.TextBox Text1 
      Height          =   270
      Left            =   1470
      TabIndex        =   2
      Top             =   525
      Width           =   2325
   End
   Begin VB.CommandButton cmdExit 
      Caption         =   "Close"
      Height          =   345
      Left            =   4830
      TabIndex        =   7
      Top             =   105
      Width           =   1200
   End
   Begin VB.CommandButton Command1 
      Caption         =   "Key Position"
      Height          =   450
      Left            =   1470
      TabIndex        =   3
      Top             =   945
      Width           =   2355
   End
   Begin OposKeylock_CCOCtl.OPOSKeylock OPOSKeylock1 
      Left            =   5280
      OleObjectBlob   =   "sKeylock4.frx":0000
      Top             =   840
   End
   Begin VB.Label Label1 
      Alignment       =   1  'Right Justify
      Caption         =   "Key Position"
      Height          =   225
      Left            =   105
      TabIndex        =   1
      Top             =   525
      Width           =   1275
   End
   Begin VB.Label Label2 
      Caption         =   "Please position change a Keylock."
      Height          =   225
      Left            =   315
      TabIndex        =   0
      Top             =   210
      Width           =   2850
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
    With OPOSKeylock1
        .RetrieveStatistics strParam
        If (.ResultCode <> OPOS_SUCCESS) Then
            strErrMsg = "RetrieveStatistics method error." + vbCrLf + vbCrLf
            strErrMsg = strErrMsg + "ResultCode = " + CStr(.ResultCode) + vbCrLf
            strErrMsg = strErrMsg + "ResultCodeExtended = " + CStr(.ResultCodeExtended)
            MsgBox strErrMsg, vbOKOnly + vbExclamation, "Keylock"
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
    
    ' Opens another window and indicates the information of the XML file.
    Step4Browser.Show

End Sub

Private Sub Command1_Click()

    MsgBox "After pressing OK button, wait for 5 seconds till the keylock position is changed."

    Me.MousePointer = 11
    Command1.Enabled = False

    With OPOSKeylock1
        Do
            .WaitForKeylockChange LOCK_KP_ANY, 5000
            Select Case .ResultCode
            Case OPOS_SUCCESS
                'The position of the keylock has been changed in time.
                Exit Do
            Case OPOS_E_TIMEOUT
                If MsgBox("The keylock position has not been changed in time. Retry?", vbYesNo + vbQuestion) = vbNo Then
                    ' Because NO is selected, break out of the loop
                    Exit Do
                End If
            Case Else
                MsgBox "Other error"
                Exit Do
            End Select
        Loop
    End With

    Command1.Enabled = True
    Me.MousePointer = 0

End Sub

Private Sub Form_Load()
    
    With OPOSKeylock1
        .Open "Unit1"
        If (.ResultCode <> OPOS_SUCCESS) Then
            MsgBox ("This device has not been registered, or cannot use.")
            GoTo LoadError
        End If
        .DeviceEnabled = True
        If (.ResultCode <> OPOS_SUCCESS) Then
            MsgBox ("Now the device is disable to use.")
            GoTo LoadError
        End If
        
        ' Set the edit box of parameter input.
        txtRetrieveSt.Text = "ModelName,HoursPoweredCount,LockPositionChangeCount"
        
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
    Dim OBJ As Object
    ' All disable to print button.
    For Each OBJ In Me
        If OBJ.Name <> "OPOSKeylock1" Then
            OBJ.Enabled = False
        End If
    Next
    ' Enable to [Close] button only.
    cmdExit.Enabled = True

End Sub

Private Sub Form_Unload(Cancel As Integer)

    With OPOSKeylock1
        .DeviceEnabled = False
        .Close
    End With

End Sub

Private Sub OPOSKeyLock1_StatusUpdateEvent(ByVal Data As Long)

    Dim sPosition As String

    Select Case OPOSKeylock1.KeyPosition
    Case LOCK_KP_LOCK:  sPosition = "Lock"
    Case LOCK_KP_NORM:  sPosition = "Normal"
    Case LOCK_KP_SUPR:  sPosition = "Supervisor"
    Case Else:          sPosition = "Else"
    End Select
    Text1.Text = CStr(OPOSKeylock1.KeyPosition) + ": " + sPosition

End Sub

