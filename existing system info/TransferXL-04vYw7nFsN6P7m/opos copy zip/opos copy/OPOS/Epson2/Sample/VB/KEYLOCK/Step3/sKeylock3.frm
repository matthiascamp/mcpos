VERSION 5.00
Object = "{CCB90090-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSKeylock.ocx"
Begin VB.Form Step3 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 3 Adding error handlers."
   ClientHeight    =   1695
   ClientLeft      =   3045
   ClientTop       =   3330
   ClientWidth     =   6210
   LinkTopic       =   "MDIForm1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   1695
   ScaleWidth      =   6210
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
      TabIndex        =   1
      Top             =   105
      Width           =   1200
   End
   Begin VB.CommandButton Command1 
      Caption         =   "Key Position"
      Height          =   450
      Left            =   1470
      TabIndex        =   0
      Top             =   945
      Width           =   2355
   End
   Begin OposKeylock_CCOCtl.OPOSKeylock OPOSKeylock1 
      Left            =   5040
      OleObjectBlob   =   "sKeylock3.frx":0000
      Top             =   600
   End
   Begin VB.Label Label1 
      Alignment       =   1  'Right Justify
      Caption         =   "Key Position"
      Height          =   225
      Left            =   105
      TabIndex        =   4
      Top             =   525
      Width           =   1275
   End
   Begin VB.Label Label2 
      Caption         =   "Please position change a Keylock."
      Height          =   225
      Left            =   315
      TabIndex        =   3
      Top             =   210
      Width           =   2850
   End
End
Attribute VB_Name = "Step3"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
'Step 3 Adding error handlers.
Option Explicit

Private Sub cmdExit_Click()

    Unload Me

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

