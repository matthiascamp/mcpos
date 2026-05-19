VERSION 5.00
Object = "{CCB90100-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSLineDisplay.ocx"
Begin VB.Form Step7 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 7 Adding error handlers."
   ClientHeight    =   3690
   ClientLeft      =   3045
   ClientTop       =   3330
   ClientWidth     =   5895
   LinkTopic       =   "MDIForm1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   3690
   ScaleWidth      =   5895
   Begin VB.CommandButton Command6 
      Caption         =   "Windows Control"
      Height          =   450
      Left            =   315
      TabIndex        =   8
      Top             =   2835
      Width           =   2250
   End
   Begin VB.Frame Frame1 
      Caption         =   "Scroll"
      Height          =   960
      Left            =   2835
      TabIndex        =   5
      Top             =   630
      Width           =   2640
      Begin VB.CommandButton Command5 
         Caption         =   "Right"
         Height          =   450
         Index           =   1
         Left            =   1365
         TabIndex        =   7
         Top             =   315
         Width           =   990
      End
      Begin VB.CommandButton Command5 
         Caption         =   "Left"
         Height          =   450
         Index           =   0
         Left            =   210
         TabIndex        =   6
         Top             =   315
         Width           =   990
      End
   End
   Begin VB.CommandButton Command4 
      Caption         =   "Teletype Characters"
      Height          =   450
      Left            =   315
      TabIndex        =   4
      Top             =   2205
      Width           =   2250
   End
   Begin VB.CommandButton Command3 
      Caption         =   "Blink Characters"
      Height          =   450
      Left            =   315
      TabIndex        =   3
      Top             =   1575
      Width           =   2250
   End
   Begin VB.CommandButton Command1 
      Caption         =   "Clear"
      Height          =   450
      Left            =   315
      TabIndex        =   2
      Top             =   315
      Width           =   2250
   End
   Begin VB.CommandButton Command2 
      Caption         =   "Specify Position"
      Height          =   450
      Left            =   315
      TabIndex        =   1
      Top             =   945
      Width           =   2250
   End
   Begin VB.CommandButton cmdExit 
      Caption         =   "Close"
      Height          =   345
      Left            =   4725
      TabIndex        =   0
      Top             =   105
      Width           =   990
   End
   Begin OposLineDisplay_CCOCtl.OPOSLineDisplay OPOSLineDisplay1 
      Left            =   4080
      OleObjectBlob   =   "sDisplay7.frx":0000
      Top             =   120
   End
End
Attribute VB_Name = "Step7"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
'Step 7 Adding error handlers.
Option Explicit

Private Sub cmdExit_Click()

    Unload Me

End Sub

'Clear the text on the window
'
Private Sub Command1_Click()

    OPOSLineDisplay1.ClearText

End Sub

'Display the text as specified.
'
Private Sub Command2_Click()

    OPOSLineDisplay1.DisplayTextAt 1, 5, "Hello OPOS.", DISP_DT_NORMAL

End Sub


'Display the blinking text
'
Private Sub Command3_Click()

    OPOSLineDisplay1.DisplayText "Blink", DISP_DT_BLINK

End Sub

'Teletype display
'
Private Sub Command4_Click()

    OPOSLineDisplay1.InterCharacterWait = 1000
    OPOSLineDisplay1.DisplayText "Teletype", DISP_DT_NORMAL

End Sub

Private Sub Command4_LostFocus()

    OPOSLineDisplay1.InterCharacterWait = 0

End Sub

'Scrolled display
'
Private Sub Command5_Click(Index As Integer)

    If Index = 0 Then
        ' Move one character to the left side
        OPOSLineDisplay1.ScrollText DISP_ST_LEFT, 1
    Else
        ' Move two characters to the right side
        OPOSLineDisplay1.ScrollText DISP_ST_RIGHT, 2
    End If

End Sub


'Window control
'
Private Sub Command6_Click()

    With OPOSLineDisplay1
        .CreateWindow 1, 10, 1, 10, 1, 34
        .MarqueeFormat = DISP_MF_WALK
        .MarqueeType = DISP_MT_INIT
        .MarqueeRepeatWait = 1000
        .MarqueeUnitWait = 100
        .DisplayText "Sale! 50%-20% OFF!", DISP_DT_NORMAL
        .MarqueeType = DISP_MT_LEFT
        
        MsgBox "When pressing OK, it ends"
        
        .MarqueeType = DISP_MT_INIT
        .DestroyWindow
    End With

End Sub

Private Sub Form_Load()

    With OPOSLineDisplay1
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
    End With

    Exit Sub

LoadError:
' Nothing can be used.
    Dim OBJ As Object
    'All objects on the form
    For Each OBJ In Me
        'Invalid exept for OPOS OCX
        If OBJ.Name <> "OPOSLineDisplay1" Then
            OBJ.Enabled = False
        End If
    Next
    cmdExit.Enabled = True              'Only the exit button is enabled.

End Sub

Private Sub Form_Unload(Cancel As Integer)

    With OPOSLineDisplay1
        .ClearText
        .DeviceEnabled = False
        .ReleaseDevice
        .Close
    End With

End Sub

Private Sub OPOSLineDisplay1_StatusUpdateEvent(ByVal Data As Long)

'The Power Reporting Requirements fires the event when the device power status is changed.
    Select Case Data
    Case OPOS_SUE_POWER_ONLINE          ' The device is powered on.
        MsgBox "The device is powered on."
    Case OPOS_SUE_POWER_OFF             ' The device is powered off, or unconnected.
        MsgBox "The device is powered off, or unconnected."
    Case OPOS_SUE_POWER_OFFLINE         ' The device is powered on, but disable to operate.
        MsgBox "The device is powered on, but disable to operate.."
    Case OPOS_SUE_POWER_OFF_OFFLINE     ' The device is powered off or off-line.
        MsgBox "The device is powered off or off-line."
    End Select

End Sub


