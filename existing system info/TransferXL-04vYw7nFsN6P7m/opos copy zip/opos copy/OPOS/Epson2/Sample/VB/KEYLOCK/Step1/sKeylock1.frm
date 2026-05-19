VERSION 5.00
Object = "{CCB90090-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSKeylock.ocx"
Begin VB.Form Step1 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 1 Normal operation: Display the current key position."
   ClientHeight    =   1275
   ClientLeft      =   3045
   ClientTop       =   3330
   ClientWidth     =   6210
   LinkTopic       =   "MDIForm1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   1275
   ScaleWidth      =   6210
   Begin VB.CommandButton cmdExit 
      Caption         =   "Close"
      Height          =   345
      Left            =   4830
      TabIndex        =   2
      Top             =   105
      Width           =   1200
   End
   Begin VB.TextBox Text1 
      Height          =   270
      Left            =   1470
      TabIndex        =   0
      Top             =   525
      Width           =   2010
   End
   Begin OposKeylock_CCOCtl.OPOSKeylock OPOSKeylock1 
      Left            =   5040
      OleObjectBlob   =   "sKeylock1.frx":0000
      Top             =   600
   End
   Begin VB.Label Label2 
      Caption         =   "Please position change a Keylock."
      Height          =   225
      Left            =   315
      TabIndex        =   3
      Top             =   210
      Width           =   2850
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
End
Attribute VB_Name = "Step1"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
'Step 1 Normal operation: Display the current key position.
Option Explicit

Private Sub cmdExit_Click()

    Unload Me

End Sub

Private Sub Form_Load()

    With OPOSKeylock1
        'Open the device
        'Use a Logical Device Name which has been set on the SetupPOS.
        .Open "Unit1"
        
        'Enable the device.
        .DeviceEnabled = True

        If .KeyPosition = -1 Then           '(If the Initial value is unstable),start up
            .CheckHealth OPOS_CH_INTERACTIVE        '  ,then set the Initial value.
        End If
    End With

End Sub

Private Sub Form_Unload(Cancel As Integer)

    With OPOSKeylock1
        'Cancel the device
        .DeviceEnabled = False
        
        'Finish using the device.
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

